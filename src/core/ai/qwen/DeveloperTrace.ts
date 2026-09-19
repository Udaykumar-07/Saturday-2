/**
 * Developer Tracing Utility for Saturday.
 *
 * Implements structured, high-visibility developer logging across the complete
 * 9-stage local AI orchestration pipeline:
 *
 * 1. REQUEST
 * 2. TASK UNDERSTANDING
 * 3. REQUIRED CAPABILITIES
 * 4. MEMORY RETRIEVAL
 * 5. ROUTING DECISION
 * 6. SELECTED PROVIDER
 * 7. EXECUTION
 * 8. VERIFICATION
 * 9. RESPONSE SOURCE
 */

export type PipelineStage =
  | 'REQUEST'
  | 'TASK_UNDERSTANDING'
  | 'REQUIRED_CAPABILITIES'
  | 'MEMORY_RETRIEVAL'
  | 'ROUTING_DECISION'
  | 'SELECTED_PROVIDER'
  | 'EXECUTION'
  | 'VERIFICATION'
  | 'RESPONSE_SOURCE';

export interface TraceRecord {
  timestamp: number;
  stage: PipelineStage;
  requestId: string;
  data: Record<string, unknown>;
}

export class DeveloperTrace {
  private static traces: TraceRecord[] = [];
  private static enabled: boolean = true;
  private static listeners: Array<(record: TraceRecord) => void> = [];

  static setEnabled(enabled: boolean): void {
    DeveloperTrace.enabled = enabled;
  }

  static record(
    requestId: string,
    stage: PipelineStage,
    data: Record<string, unknown>
  ): TraceRecord {
    const record: TraceRecord = {
      timestamp: Date.now(),
      stage,
      requestId,
      data,
    };

    if (DeveloperTrace.enabled) {
      DeveloperTrace.traces.push(record);
      if (DeveloperTrace.traces.length > 500) {
        DeveloperTrace.traces.shift();
      }

      const formatted = `[SATURDAY_TRACE] [${stage}] (${requestId}) ${JSON.stringify(data)}`;
      console.log(formatted);

      for (const listener of DeveloperTrace.listeners) {
        try {
          listener(record);
        } catch {
          // Ignore listener errors
        }
      }
    }

    return record;
  }

  static addListener(listener: (record: TraceRecord) => void): () => void {
    DeveloperTrace.listeners.push(listener);
    return () => {
      DeveloperTrace.listeners = DeveloperTrace.listeners.filter((l) => l !== listener);
    };
  }

  static getTraces(requestId?: string): TraceRecord[] {
    if (!requestId) return [...DeveloperTrace.traces];
    return DeveloperTrace.traces.filter((t) => t.requestId === requestId);
  }

  static clear(): void {
    DeveloperTrace.traces = [];
  }
}
