/**
 * Task Requirements Analyzer for Saturday.
 *
 * Analyzes natural language user input and classified intent to derive
 * structured execution requirements before routing.
 *
 * Examples:
 * - "What's my battery percentage?" -> reasoning: 'none', external: false, localOnly: true
 * - "Open YouTube" -> capabilities: ['app.launch'], localOnly: true, toolUseRequired: true
 * - "Show my latest emails" -> capabilities: ['gmail.read_latest'], external: true, toolUseRequired: true
 * - "Research 30 companies and compare them" -> reasoning: 'deep', external: true, multiStep: true
 */

import { TaskIntent, TaskType } from '../../types/task';
import { TaskRequirements, ReasoningLevel, TaskPrivacyLevel } from '../../types/external';

export class TaskRequirementsAnalyzer {
  /**
   * Analyze input and task classification to produce structured requirements.
   */
  analyze(input: string, intent?: TaskIntent): TaskRequirements {
    const lower = input.toLowerCase().trim();
    const type: TaskType = intent?.type || 'UNKNOWN';

    // Default baseline requirements
    let reasoningLevel: ReasoningLevel = 'basic';
    let toolUseRequired = false;
    let externalAccessRequired = false;
    let localOnly = false;
    let privacyLevel: TaskPrivacyLevel = 'standard';
    let multiStep = false;
    const capabilities: string[] = [];

    // 0. Memory Operations (Local only, highest privacy)
    if (
      type === 'MEMORY_STORE' ||
      type === 'MEMORY_QUERY' ||
      type === 'MEMORY_UPDATE' ||
      type === 'MEMORY_DELETE' ||
      type === 'MEMORY_LIST'
    ) {
      localOnly = true;
      externalAccessRequired = false;
      reasoningLevel = 'none';
      toolUseRequired = false;
      privacyLevel = 'local';
      capabilities.push('chat');
    }

    // 1. Android Action & Phone Action
    else if (type === 'APP_ACTION' || type === 'PHONE_ACTION') {
      localOnly = true;
      externalAccessRequired = false;
      reasoningLevel = 'none';
      toolUseRequired = true;
      privacyLevel = 'local';

      if (lower.includes('open') || lower.includes('launch')) {
        capabilities.push('app.launch');
      }
      if (lower.includes('search') && lower.includes('on')) {
        capabilities.push('app.launch', 'url.open');
        multiStep = true;
      }
      if (lower.includes('call') || lower.includes('dial')) {
        capabilities.push('phone.call');
      }
      if (lower.includes('battery') || lower.includes('device') || lower.includes('wifi') || lower.includes('storage')) {
        capabilities.push('device.info');
      }
    }

    // 2. Gmail & API Tasks
    else if (
      type === 'API_TASK' ||
      type === 'EXTERNAL_API' ||
      lower.includes('email') ||
      lower.includes('gmail') ||
      lower.includes('inbox')
    ) {
      externalAccessRequired = true;
      toolUseRequired = true;
      localOnly = false;
      privacyLevel = 'private'; // Personal email data

      if (lower.includes('search') || lower.includes('find') || lower.includes('from')) {
        capabilities.push('gmail.search');
        reasoningLevel = 'basic';
      } else {
        capabilities.push('gmail.read_latest');
        reasoningLevel = 'basic';
      }

      if (lower.includes('and open') || lower.includes('and find location') || lower.includes('maps')) {
        multiStep = true;
        capabilities.push('app.launch', 'url.open');
      }
    }

    // 3. Deep Research & External Agent Tasks
    else if (
      type === 'AGENT_TASK' ||
      lower.startsWith('ask the') ||
      lower.includes('research') ||
      lower.includes('compare 20') ||
      lower.includes('compare 30') ||
      lower.includes('find me the best flight') ||
      lower.includes('travel agent')
    ) {
      reasoningLevel = 'deep';
      externalAccessRequired = true;
      multiStep = true;
      toolUseRequired = true;
      capabilities.push('agent.research', 'web.search');
    }

    // 4. Complex Reasoning / External Model Tasks
    else if (
      type === 'REASONING' ||
      type === 'EXTERNAL_AI' ||
      lower.includes('explain this complex') ||
      lower.includes('analyze this paper') ||
      lower.includes('difficult document') ||
      lower.includes('evaluate')
    ) {
      reasoningLevel = 'advanced';
      externalAccessRequired = true;
      capabilities.push('model.reasoning');
    }

    // 5. General Device Info Questions (e.g. "What's my battery percentage?")
    else if (lower.includes('battery') || lower.includes('storage') || lower.includes('wifi')) {
      localOnly = true;
      externalAccessRequired = false;
      reasoningLevel = 'none';
      capabilities.push('device.info');
    }

    // 6. Simple Chat & Questions
    else {
      reasoningLevel = 'basic';
      localOnly = false;
      externalAccessRequired = false;
      capabilities.push('chat');
    }

    // Phase 4 Detections:
    const freshInformationRequired =
      lower.includes('latest') ||
      lower.includes('recent') ||
      lower.includes('current') ||
      lower.includes('news') ||
      lower.includes('today');

    const requiresAuthentication =
      capabilities.some((c) => c.startsWith('gmail.')) ||
      lower.includes('my email') ||
      lower.includes('my calendar');

    const agenticExecutionRequired =
      lower.includes('book me') ||
      lower.includes('book a') ||
      lower.includes('reserve') ||
      lower.includes('order') ||
      lower.includes('plan a full');

    return {
      capabilities: capabilities.length > 0 ? capabilities : ['general'],
      requiredCapabilities: capabilities.length > 0 ? capabilities : ['general'],
      reasoningLevel,
      toolUseRequired,
      externalAccessRequired,
      localOnly,
      privacyLevel,
      multiStep,
      freshInformationRequired,
      requiresCurrentData: freshInformationRequired,
      requiresAuthentication,
      agenticExecutionRequired,
    };
  }
}
