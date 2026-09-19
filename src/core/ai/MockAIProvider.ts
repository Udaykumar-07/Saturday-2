/**
 * Mock AI provider for development and testing.
 * Returns canned responses — clearly identified as mock.
 */

import { AIProvider, AIRequest, AIResponse, IntelligenceCapability } from '../types/ai';

export class MockAIProvider implements AIProvider {
  readonly id = 'mock';
  readonly name = 'Mock AI Provider (Development)';
  readonly type = 'local_model' as const;

  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  async isAvailable(): Promise<boolean> {
    return this.enabled;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    // Simulate a small delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const lastMessage = request.messages[request.messages.length - 1];
    const userInput = lastMessage?.content ?? '';

    const content = this.generateMockResponse(userInput);

    return {
      content,
      providerId: this.id,
      modelId: 'mock-v1',
      usage: {
        inputTokens: userInput.split(/\s+/).length,
        outputTokens: content.split(/\s+/).length,
      },
      metadata: {
        isMock: true,
      },
    };
  }

  getCapabilities(): IntelligenceCapability[] {
    return [
      { id: 'chat', category: 'conversation', score: 0.3 },
    ];
  }

  /** Enable or disable this provider. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private generateMockResponse(input: string): string {
    const lower = input.toLowerCase();

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return "Hello! I'm Saturday, your personal AI assistant. I'm currently running in development mode with a mock provider. Once a real AI model is configured, I'll be able to help you with much more.";
    }

    if (lower.includes('help')) {
      return "I'm Saturday — built to help you get things done. Right now I'm running with a mock provider for development. In future versions, I'll be able to:\n\n• Answer questions using AI models\n• Interact with apps on your device\n• Search the web\n• Manage tasks and reminders\n• And much more.";
    }

    if (lower.includes('who are you') || lower.includes('what are you')) {
      return "I'm Saturday — a personal AI assistant designed to figure out the technology you need to get things done. You tell me what you want, and I work out how to make it happen.";
    }

    return `I understand your request: "${input.substring(0, 80)}${input.length > 80 ? '...' : ''}". I'm currently in development mode with a mock AI provider. When a real model is configured, I'll provide a proper response.`;
  }
}
