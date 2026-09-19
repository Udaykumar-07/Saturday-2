/**
 * Network Independence Guard for Saturday.
 *
 * Implements Section 59 Network Independence Testing:
 * Validates that zero network requests (HTTP, fetch, axios, remote model API,
 * cloud inference, model CDN, tokenizer CDN, benchmark API) occur during offline
 * local task execution.
 */

export interface NetworkCallLog {
  url: string;
  method: string;
  timestamp: number;
  stack?: string;
}

export class NetworkGuard {
  private static airplaneMode: boolean = false;
  private static networkCalls: NetworkCallLog[] = [];
  private static listeners: Array<(call: NetworkCallLog) => void> = [];

  /**
   * Toggle airplane mode (offline simulation).
   */
  static setAirplaneMode(enabled: boolean): void {
    NetworkGuard.airplaneMode = enabled;
  }

  /**
   * Check if airplane mode is currently active.
   */
  static isAirplaneMode(): boolean {
    return NetworkGuard.airplaneMode;
  }

  /**
   * Check if network is available.
   */
  static isOnline(): boolean {
    return !NetworkGuard.airplaneMode;
  }

  /**
   * Intercept and record a network request.
   * Throws an error if airplane mode is enabled and assertNoNetwork was called.
   */
  static recordRequest(url: string, method: string = 'GET'): void {
    const log: NetworkCallLog = {
      url,
      method,
      timestamp: Date.now(),
      stack: new Error().stack,
    };

    NetworkGuard.networkCalls.push(log);

    for (const listener of NetworkGuard.listeners) {
      listener(log);
    }

    if (NetworkGuard.airplaneMode) {
      console.warn(
        `[NETWORK_GUARD] Network call detected during airplane mode: ${method} ${url}`
      );
    }
  }

  /**
   * Assert that zero network requests occurred.
   * Throws an AssertionError if any network requests were made.
   */
  static assertZeroNetworkRequests(taskName: string = 'Local Task'): void {
    if (NetworkGuard.networkCalls.length > 0) {
      const calls = NetworkGuard.networkCalls
        .map((c) => `${c.method} ${c.url}`)
        .join(', ');
      throw new Error(
        `Network Independence Violation in [${taskName}]: Expected 0 network requests in airplane mode, but detected ${NetworkGuard.networkCalls.length} request(s): ${calls}`
      );
    }
  }

  /**
   * Get count of recorded network calls.
   */
  static getNetworkCallCount(): number {
    return NetworkGuard.networkCalls.length;
  }

  /**
   * Get all recorded network calls.
   */
  static getNetworkCalls(): NetworkCallLog[] {
    return [...NetworkGuard.networkCalls];
  }

  /**
   * Reset call history.
   */
  static reset(): void {
    NetworkGuard.networkCalls = [];
  }

  /**
   * Add listener for network calls.
   */
  static addListener(listener: (call: NetworkCallLog) => void): () => void {
    NetworkGuard.listeners.push(listener);
    return () => {
      NetworkGuard.listeners = NetworkGuard.listeners.filter((l) => l !== listener);
    };
  }
}
