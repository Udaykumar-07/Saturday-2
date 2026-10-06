/**
 * Pure TypeScript tokenizer for Laya's ModernBERT model.
 *
 * Replaces the Node.js-only @huggingface/tokenizers (Rust NAPI addon)
 * with a React Native compatible implementation.
 *
 * Loads HuggingFace tokenizer.json format and supports:
 *   - BPE (Byte-Pair Encoding) with byte-level pre-tokenization
 *   - WordPiece tokenization (classic BERT style)
 *   - Special token handling ([CLS], [SEP], [MASK], [PAD])
 *
 * Performance note: tokenization is pure CPU computation (~1-5ms per sentence).
 * The tokenizer.json vocabulary is loaded once and cached.
 */

// ── GPT-2 Byte-to-Unicode mapping ──
// Maps each byte (0-255) to a unique printable Unicode character.
// This lets BPE operate on text without worrying about multi-byte UTF-8.
function buildByteToUnicode(): Map<number, string> {
  const bs: number[] = [];
  // Printable ASCII ranges
  for (let i = 33; i <= 126; i++) bs.push(i);   // ! to ~
  for (let i = 161; i <= 172; i++) bs.push(i);  // ¡ to ¬
  for (let i = 174; i <= 255; i++) bs.push(i);  // ® to ÿ
  const cs = [...bs];
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n);
      n++;
    }
  }
  const result = new Map<number, string>();
  for (let i = 0; i < bs.length; i++) {
    result.set(bs[i], String.fromCodePoint(cs[i]));
  }
  return result;
}

function buildUnicodeToByte(): Map<string, number> {
  const b2u = buildByteToUnicode();
  const result = new Map<string, number>();
  for (const [b, u] of b2u) {
    result.set(u, b);
  }
  return result;
}

const BYTE_TO_UNICODE = buildByteToUnicode();

/**
 * Encode a string to byte-level unicode representation (GPT-2 style).
 */
function textToByteTokens(text: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  let result = '';
  for (const b of bytes) {
    result += BYTE_TO_UNICODE.get(b) || String.fromCodePoint(b);
  }
  return result;
}

// ── Pre-tokenization patterns ──
// GPT-2 / ByteLevel pre-tokenizer regex pattern
const BYTE_LEVEL_PATTERN =
  /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

// Simple whitespace + punctuation splitter (BERT-style fallback)
const WHITESPACE_PATTERN = /\S+/g;

/** Parsed HuggingFace tokenizer.json structure */
interface TokenizerJSON {
  model: {
    type: string;
    vocab: Record<string, number>;
    merges?: string[];
    continuing_subword_prefix?: string;
    unk_token?: string;
  };
  added_tokens?: Array<{
    id: number;
    content: string;
    special?: boolean;
  }>;
  pre_tokenizer?: {
    type: string;
    add_prefix_space?: boolean;
    [key: string]: unknown;
  };
  normalizer?: {
    type: string;
    [key: string]: unknown;
  };
}

export class LayaTokenizer {
  private vocab: Map<string, number> = new Map();
  private reverseVocab: Map<number, string> = new Map();
  private mergeRanks: Map<string, number> = new Map();
  private specialTokens: Map<string, number> = new Map();
  private modelType: 'BPE' | 'WordPiece' = 'BPE';
  private useByteLevel = true;
  private continuingPrefix = '##';
  private unkTokenId = 0;
  private addPrefixSpace = false;

  private constructor() {}

  /**
   * Load a tokenizer from parsed tokenizer.json content.
   * Call with the JSON-parsed content of tokenizer.json.
   */
  static fromJSON(json: TokenizerJSON): LayaTokenizer {
    const tok = new LayaTokenizer();

    // Detect model type
    const modelType = json.model?.type?.toUpperCase();
    if (modelType === 'WORDPIECE') {
      tok.modelType = 'WordPiece';
      tok.useByteLevel = false;
    } else {
      tok.modelType = 'BPE';
    }

    // Detect pre-tokenizer type
    const preType = json.pre_tokenizer?.type;
    if (preType === 'ByteLevel') {
      tok.useByteLevel = true;
      tok.addPrefixSpace = json.pre_tokenizer?.add_prefix_space === true;
    } else if (preType === 'BertPreTokenizer' || preType === 'Whitespace') {
      tok.useByteLevel = false;
    }
    // For Sequence pre-tokenizers, check inner types
    if (preType === 'Sequence' && json.pre_tokenizer) {
      const pretoks = (json.pre_tokenizer as any).pretokenizers;
      if (Array.isArray(pretoks)) {
        for (const pt of pretoks) {
          if (pt.type === 'ByteLevel') {
            tok.useByteLevel = true;
            tok.addPrefixSpace = pt.add_prefix_space === true;
          }
        }
      }
    }

    // Load vocabulary
    if (json.model?.vocab) {
      for (const [token, id] of Object.entries(json.model.vocab)) {
        tok.vocab.set(token, id);
        tok.reverseVocab.set(id, token);
      }
    }

    // Load BPE merge rules
    if (json.model?.merges) {
      for (let i = 0; i < json.model.merges.length; i++) {
        tok.mergeRanks.set(json.model.merges[i], i);
      }
    }

    // Load special/added tokens
    if (json.added_tokens) {
      for (const at of json.added_tokens) {
        tok.specialTokens.set(at.content, at.id);
        tok.vocab.set(at.content, at.id);
        tok.reverseVocab.set(at.id, at.content);
      }
    }

    // Set continuing prefix for WordPiece
    if (json.model?.continuing_subword_prefix) {
      tok.continuingPrefix = json.model.continuing_subword_prefix;
    }

    // Set unk token
    const unkToken = json.model?.unk_token || '[UNK]';
    tok.unkTokenId = tok.vocab.get(unkToken) ?? 0;

    return tok;
  }

  /**
   * Get the ID for a specific token.
   * Returns undefined if the token is not in the vocabulary.
   */
  tokenToId(token: string): number | undefined {
    return this.vocab.get(token);
  }

  /**
   * Get the token string for a specific ID.
   */
  idToToken(id: number): string | undefined {
    return this.reverseVocab.get(id);
  }

  /**
   * Encode text to token IDs without adding special tokens.
   * This matches the behavior of:
   *   tok.encode(text, { add_special_tokens: false }).ids
   */
  encode(text: string): number[] {
    if (!text) return [];

    if (this.modelType === 'WordPiece') {
      return this.encodeWordPiece(text);
    }
    return this.encodeBPE(text);
  }

  /** Vocabulary size */
  get vocabSize(): number {
    return this.vocab.size;
  }

  // ── BPE Encoding ──

  private encodeBPE(text: string): number[] {
    let processedText = text;
    if (this.addPrefixSpace && !processedText.startsWith(' ')) {
      processedText = ' ' + processedText;
    }

    // Pre-tokenize: split into words
    const pattern = this.useByteLevel ? BYTE_LEVEL_PATTERN : WHITESPACE_PATTERN;
    const words = processedText.match(pattern) || [];

    const ids: number[] = [];
    for (const word of words) {
      // Convert to byte-level representation if needed
      const encoded = this.useByteLevel ? textToByteTokens(word) : word;

      // Split into individual characters
      const chars = Array.from(encoded);

      // Apply BPE merges
      const merged = this.applyBPE(chars);

      // Look up each token in vocab
      for (const token of merged) {
        const id = this.vocab.get(token);
        if (id !== undefined) {
          ids.push(id);
        } else {
          // Unknown token - try character by character
          for (const ch of Array.from(token)) {
            const chId = this.vocab.get(ch);
            ids.push(chId ?? this.unkTokenId);
          }
        }
      }
    }

    return ids;
  }

  /**
   * Apply BPE merges to a list of tokens.
   * Iteratively merges the highest-priority pair until no more merges are possible.
   */
  private applyBPE(tokens: string[]): string[] {
    if (tokens.length <= 1) return tokens;

    let word = [...tokens];

    while (word.length > 1) {
      // Find the pair with the lowest merge rank
      let bestRank = Infinity;
      let bestIdx = -1;

      for (let i = 0; i < word.length - 1; i++) {
        const pair = word[i] + ' ' + word[i + 1];
        const rank = this.mergeRanks.get(pair);
        if (rank !== undefined && rank < bestRank) {
          bestRank = rank;
          bestIdx = i;
        }
      }

      // No more merges possible
      if (bestIdx === -1) break;

      // Merge the pair
      const merged = word[bestIdx] + word[bestIdx + 1];
      word.splice(bestIdx, 2, merged);
    }

    return word;
  }

  // ── WordPiece Encoding ──

  private encodeWordPiece(text: string): number[] {
    // Simple whitespace + punctuation split
    const words = text.match(/[\w]+|[^\w\s]/g) || [];
    const ids: number[] = [];

    for (const word of words) {
      const wordLower = word.toLowerCase();
      const subTokens = this.wordPieceTokenize(wordLower);
      ids.push(...subTokens);
    }

    return ids;
  }

  /**
   * WordPiece greedy tokenization.
   * Finds the longest matching prefix in the vocab, then continues with ## prefix.
   */
  private wordPieceTokenize(word: string): number[] {
    const ids: number[] = [];
    let start = 0;

    while (start < word.length) {
      let end = word.length;
      let found = false;

      while (start < end) {
        const substr = (start > 0 ? this.continuingPrefix : '') + word.slice(start, end);
        const id = this.vocab.get(substr);
        if (id !== undefined) {
          ids.push(id);
          found = true;
          start = end;
          break;
        }
        end--;
      }

      if (!found) {
        ids.push(this.unkTokenId);
        start++;
      }
    }

    return ids;
  }
}
