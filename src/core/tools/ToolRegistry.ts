/**
 * ToolRegistry - Ultra-fast deterministic tools
 * These tools provide 100% accurate answers WITHOUT using the LLM
 * 
 * SPEED: <1ms response time for deterministic queries
 */

import { EvaluationResult } from '../validation/ResponseEvaluator';

export interface Tool {
  name: string;
  description: string;
  
  /**
   * Pattern to match user input (regex)
   */
  matcher: RegExp;
  
  /**
   * Execute tool and return result
   */
  execute(input: string, context?: any): Promise<string>;
  
  /**
   * Self-evaluate tool output
   */
  evaluate(input: string, output: string): EvaluationResult;
}

export interface ToolExecutionResult {
  result: string;
  evaluation: EvaluationResult;
  toolName: string;
  executionTimeMs: number;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    // Register all deterministic tools
    this.registerDefaultTools();
  }

  /**
   * Register built-in fast tools
   */
  private registerDefaultTools(): void {
    this.register(new MathTool());
    this.register(new DateTimeTool());
    this.register(new MemoryRetrievalTool());
  }

  /**
   * Register a new tool
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
    console.log(`🔧 Registered tool: ${tool.name}`);
  }

  /**
   * INSTANT: Try to handle query with deterministic tool
   * Returns null if no tool matches
   */
  async tryExecute(
    userInput: string,
    context?: any
  ): Promise<ToolExecutionResult | null> {
    const startTime = Date.now();

    // Find matching tool
    for (const tool of this.tools.values()) {
      if (tool.matcher.test(userInput)) {
        console.log(`⚡ Fast-path: ${tool.name}`);
        
        const result = await tool.execute(userInput, context);
        const evaluation = tool.evaluate(userInput, result);
        const executionTimeMs = Date.now() - startTime;

        return {
          result,
          evaluation,
          toolName: tool.name,
          executionTimeMs,
        };
      }
    }

    return null; // No tool matched, use LLM
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
}

/**
 * MathTool - 100% accurate arithmetic
 * Handles: "2+2", "what is 15*3", "3x5+8", etc.
 */
export class MathTool implements Tool {
  name = 'math';
  description = 'Evaluates mathematical expressions';
  matcher = /\d+\s*[\+\-\*\/xX×^%()]\s*\d+|what\s+is\s+\d+/i;

  async execute(input: string): Promise<string> {
    try {
      // Extract math expression
      let expr = input
        .replace(/^(?:what\s+is|calculate|compute|solve|eval)\s+/i, '')
        .trim();

      // Store original for display (with nice symbols)
      const displayExpr = expr
        .replace(/\s+/g, '')
        .replace(/[xX]/g, '×')
        .replace(/\*/g, '×');

      // Normalize for evaluation
      expr = expr
        .replace(/\s+/g, '')
        .replace(/[×xX]/g, '*')  // Convert all multiplication symbols to *
        .replace(/\^/g, '**');    // Convert ^ to **

      // Sanitize and evaluate
      const sanitized = expr.replace(/[^0-9+\-*/().%]/g, '');

      if (sanitized.length === 0 || sanitized.length > 50) {
        return 'Invalid math expression';
      }

      // Safe evaluation using Function constructor
      // This CORRECTLY handles order of operations: * and / before + and -
      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${sanitized})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        return 'Invalid result';
      }

      // Format result
      const display = Number.isInteger(result)
        ? result.toString()
        : result.toFixed(6).replace(/\.?0+$/, '');

      return `${displayExpr} = **${display}**`;
    } catch (error) {
      console.error('Math error:', error);
      return 'Error evaluating expression';
    }
  }

  evaluate(input: string, output: string): EvaluationResult {
    // Verify result is present and formatted correctly
    const hasResult = /=\s*\*\*[\d.]+\*\*/.test(output);
    const notError = !output.includes('Error') && !output.includes('Invalid');

    const passed = hasResult && notError;

    return {
      passed,
      score: passed ? 1.0 : 0.0,
      failureReasons: passed ? [] : ['Math evaluation failed'],
      confidence: 1.0,
      fastPath: true,
    };
  }
}

/**
 * DateTimeTool - Instant date/time responses
 * Handles: "what time", "what date", "what day", etc.
 */
export class DateTimeTool implements Tool {
  name = 'datetime';
  description = 'Provides current date and time';
  matcher = /what\s+(time|date|day)|current\s+(time|date)|time\s+now|date\s+today/i;

  async execute(input: string): Promise<string> {
    const now = new Date();
    const lower = input.toLowerCase();

    // Time query
    if (/time/i.test(lower)) {
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const date = now.toLocaleDateString([], { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `It's ${time} on ${date}.`;
    }

    // Date/day query
    const date = now.toLocaleDateString([], { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    return `Today is ${date}.`;
  }

  evaluate(input: string, output: string): EvaluationResult {
    // Check if output contains time or date
    const hasTimeOrDate = /\d{1,2}:\d{2}|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/.test(output);

    return {
      passed: hasTimeOrDate,
      score: hasTimeOrDate ? 1.0 : 0.0,
      failureReasons: hasTimeOrDate ? [] : ['Date/time not found in output'],
      confidence: 1.0,
      fastPath: true,
    };
  }
}

/**
 * MemoryRetrievalTool - Instant memory lookups
 * Handles: "what's my name", "what do you know about me", etc.
 */
export class MemoryRetrievalTool implements Tool {
  name = 'memory_retrieval';
  description = 'Retrieves stored user memories';
  matcher = /what('?s| is)\s+my\s+|what\s+do\s+you\s+(remember|know)\s+about\s+me|my\s+name\s+is|remember\s+that/i;

  async execute(input: string, context?: any): Promise<string> {
    const memories = context?.memories || [];
    const lower = input.toLowerCase();

    // Name query
    if (/what('?s| is)\s+my\s+name/.test(lower) || /who\s+am\s+i/.test(lower)) {
      const nameMem = memories.find((m: any) => m.key === 'user.name');
      if (nameMem?.value) {
        return `Your name is ${nameMem.value}.`;
      }
      return "I don't have your name saved yet. What should I call you?";
    }

    // List all memories
    if (/what\s+do\s+you\s+(remember|know)/.test(lower) || /list\s+(my\s+)?memories/.test(lower)) {
      if (memories.length === 0) {
        return "I don't have any memories saved about you yet.";
      }

      const list = memories
        .map((m: any) => `• **${m.key.replace(/^user\./, '').replace(/\./g, ' ')}**: ${m.value}`)
        .join('\n');
      return `Here's what I remember about you:\n\n${list}`;
    }

    // Generic memory response
    if (memories.length > 0) {
      return `I have ${memories.length} ${memories.length === 1 ? 'memory' : 'memories'} stored about you.`;
    }

    return "I don't have any memories stored about you yet.";
  }

  evaluate(input: string, output: string): EvaluationResult {
    // Check if output references memory
    const hasMemoryReference = /your name|remember|stored|saved|memory|memories/i.test(output);

    return {
      passed: hasMemoryReference,
      score: hasMemoryReference ? 1.0 : 0.5,
      failureReasons: hasMemoryReference ? [] : ['Output doesn\'t reference memory'],
      confidence: 0.9,
      fastPath: true,
    };
  }
}
