/**
 * Tests for TaskRequirementsAnalyzer.
 */

import { TaskRequirementsAnalyzer } from '../core/external/routing/TaskRequirementsAnalyzer';
import { TaskIntent } from '../core/types/task';

describe('TaskRequirementsAnalyzer', () => {
  let analyzer: TaskRequirementsAnalyzer;

  beforeEach(() => {
    analyzer = new TaskRequirementsAnalyzer();
  });

  test('analyzes local app action as localOnly with toolUseRequired', () => {
    const intent: TaskIntent = {
      type: 'APP_ACTION',
      confidence: 0.8,
      originalInput: 'Open YouTube',
    };

    const reqs = analyzer.analyze('Open YouTube', intent);
    expect(reqs.localOnly).toBe(true);
    expect(reqs.toolUseRequired).toBe(true);
    expect(reqs.capabilities).toContain('app.launch');
    expect(reqs.privacyLevel).toBe('local');
  });

  test('analyzes email task with private privacyLevel and external access', () => {
    const intent: TaskIntent = {
      type: 'API_TASK',
      confidence: 0.8,
      originalInput: 'Show my latest emails',
    };

    const reqs = analyzer.analyze('Show my latest emails', intent);
    expect(reqs.externalAccessRequired).toBe(true);
    expect(reqs.toolUseRequired).toBe(true);
    expect(reqs.privacyLevel).toBe('private');
    expect(reqs.capabilities).toContain('gmail.read_latest');
  });

  test('analyzes deep research task with deep reasoning and multiStep', () => {
    const intent: TaskIntent = {
      type: 'AGENT_TASK',
      confidence: 0.9,
      originalInput: 'Research 30 companies and compare them',
    };

    const reqs = analyzer.analyze('Research 30 companies and compare them', intent);
    expect(reqs.reasoningLevel).toBe('deep');
    expect(reqs.externalAccessRequired).toBe(true);
    expect(reqs.multiStep).toBe(true);
  });

  test('analyzes complex reasoning paper with advanced reasoning', () => {
    const intent: TaskIntent = {
      type: 'REASONING',
      confidence: 0.7,
      originalInput: 'Explain this complex paper',
    };

    const reqs = analyzer.analyze('Explain this complex paper', intent);
    expect(reqs.reasoningLevel).toBe('advanced');
    expect(reqs.externalAccessRequired).toBe(true);
    expect(reqs.capabilities).toContain('model.reasoning');
  });
});
