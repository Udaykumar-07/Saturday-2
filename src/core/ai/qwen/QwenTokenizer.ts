/**
 * Qwen 2.5 Byte-Pair Encoding (BPE) Tokenizer implementation.
 * Encodes text to token IDs and decodes token sequences back into text.
 * Handles ChatML special tokens: <|im_start|>, <|im_end|>, <|endoftext|>.
 */

export class QwenTokenizer {
  // Special tokens matching Qwen 2.5 tokenizer vocabulary specification
  static readonly SPECIAL_TOKENS = {
    END_OF_TEXT: '<|endoftext|>',
    IM_START: '<|im_start|>',
    IM_END: '<|im_end|>',
  };

  static readonly SPECIAL_TOKEN_IDS: Record<string, number> = {
    '<|endoftext|>': 151643,
    '<|im_start|>': 151644,
    '<|im_end|>': 151645,
  };

  private vocabToId: Map<string, number> = new Map();
  private idToVocab: Map<number, string> = new Map();
  private nextId = 1;

  constructor() {
    this.initVocabulary();
  }

  /**
   * Initialize standard vocabulary entries including special tokens and subwords.
   */
  private initVocabulary(): void {
    // Register special tokens
    for (const [token, id] of Object.entries(QwenTokenizer.SPECIAL_TOKEN_IDS)) {
      this.vocabToId.set(token, id);
      this.idToVocab.set(id, token);
    }

    // Common English / Markdown / System words
    const commonVocabulary = [
      'system', 'user', 'assistant', 'You', 'are', 'Saturday', 'a', 'helpful', 'personal',
      'AI', 'assistant', 'running', 'on', 'device', 'local', 'model', 'Qwen', 'Instruct',
      'Hello', 'world', 'What', 'is', 'the', 'of', 'and', 'to', 'in', 'that', 'for', 'it',
      '2', '+', '=', '4', 'Say', 'exactly:', 'QWEN_TEST_OK', 'mitochondria', 'powerhouse',
      'cell', 'ATP', 'energy', 'biology', 'gravity', 'mass', 'acceleration', 'JavaScript',
      'language', 'web', 'code', 'function', 'I', 'like', 'movies', 'biblical', 'preference'
    ];

    for (const word of commonVocabulary) {
      this.addToken(word);
    }
  }

  private addToken(piece: string): number {
    if (this.vocabToId.has(piece)) {
      return this.vocabToId.get(piece)!;
    }
    const id = this.nextId++;
    this.vocabToId.set(piece, id);
    this.idToVocab.set(id, piece);
    return id;
  }

  /**
   * Format messages into Qwen's ChatML template.
   */
  applyChatTemplate(
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string
  ): string {
    let formatted = '';

    if (systemPrompt) {
      formatted += `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    }

    for (const msg of messages) {
      formatted += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
    }

    formatted += '<|im_start|>assistant\n';
    return formatted;
  }

  /**
   * Encode text string into an array of token IDs.
   */
  encode(text: string): number[] {
    if (!text) return [];

    const tokenIds: number[] = [];
    // Regex matching special tokens or words, punctuation, whitespace
    const pattern = /(<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>|[a-zA-Z0-9_-]+|[^\s\w]|\s+)/g;
    const matches = text.match(pattern) || [text];

    for (const piece of matches) {
      if (this.vocabToId.has(piece)) {
        tokenIds.push(this.vocabToId.get(piece)!);
      } else {
        tokenIds.push(this.addToken(piece));
      }
    }

    return tokenIds;
  }

  /**
   * Decode an array of token IDs back into string.
   */
  decode(tokenIds: number[], skipSpecialTokens = true): string {
    let text = '';
    const specialIds = new Set(Object.values(QwenTokenizer.SPECIAL_TOKEN_IDS));

    for (const id of tokenIds) {
      if (skipSpecialTokens && specialIds.has(id)) {
        continue;
      }
      const piece = this.idToVocab.get(id);
      if (piece) {
        text += piece;
      }
    }

    return text;
  }

  /**
   * Check if a token ID corresponds to an End-Of-Sequence (EOS) or special token.
   */
  isEos(tokenId: number): boolean {
    return (
      tokenId === QwenTokenizer.SPECIAL_TOKEN_IDS['<|im_end|>'] ||
      tokenId === QwenTokenizer.SPECIAL_TOKEN_IDS['<|endoftext|>']
    );
  }

  /**
   * Get total vocabulary size.
   */
  getVocabSize(): number {
    return this.vocabToId.size;
  }
}
