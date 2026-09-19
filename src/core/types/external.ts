/**
 * External Intelligence, APIs, Authentication & Agent Communication Types for Saturday Phase 3.
 *
 * Defines contracts for:
 * - External Intelligence Providers & Registries
 * - External Requests and Responses
 * - Task Requirements & Analysis
 * - Authentication, Credential Storage & Sessions
 * - Agent Communication & Delegation (Protocols, Tasks, Permissions)
 * - Model Context Protocol (MCP) Foundation
 * - Data Boundary & Minimization
 * - Provider Health Tracking
 */

// ---------------------------------------------------------------------------
// External Request & Response
// ---------------------------------------------------------------------------

export type ExternalPrivacyLevel = 'local_only' | 'private' | 'standard';

export interface ExternalRequestConstraints {
  maxCost?: number;
  maxLatencyMs?: number;
  privacy?: ExternalPrivacyLevel;
}

/**
 * Standardized request to any external intelligence provider, agent, or API.
 */
export interface ExternalRequest {
  taskId: string;
  objective: string;
  input?: unknown;
  requiredCapabilities: string[];
  context?: unknown;
  constraints?: ExternalRequestConstraints;
}

export type ExternalResponseStatus =
  | 'completed'
  | 'failed'
  | 'requires_authentication'
  | 'requires_user_input';

/**
 * Standardized response from an external provider or agent.
 * Note: External models/providers must NEVER return arbitrary executable commands.
 */
export interface ExternalResponse {
  taskId: string;
  status: ExternalResponseStatus;
  result?: unknown;
  providerId: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Task Requirements
// ---------------------------------------------------------------------------

export type ReasoningLevel = 'none' | 'basic' | 'advanced' | 'deep';
export type TaskPrivacyLevel = 'local' | 'private' | 'standard';

/**
 * Structured requirements characterizing what a task needs before routing.
 */
export interface TaskRequirements {
  capabilities: string[];
  reasoningLevel: ReasoningLevel;
  toolUseRequired: boolean;
  externalAccessRequired: boolean;
  localOnly: boolean;
  privacyLevel: TaskPrivacyLevel;
  multiStep: boolean;

  // Phase 4 Extensions
  preferredCapabilities?: string[];
  requiredCapabilities?: string[];
  agenticExecutionRequired?: boolean;
  maxLatencyMs?: number;
  maxCost?: number;
  costMode?: 'FREE_PREFERRED' | 'BALANCED' | 'QUALITY_PREFERRED' | 'NO_COST_LIMIT';
  freshInformationRequired?: boolean;
  requiresCurrentData?: boolean;
  requiresAuthentication?: boolean;
  parallelExecutionAllowed?: boolean;
  minimumReliability?: number;
  inputType?: string;
  outputType?: string;
}

// ---------------------------------------------------------------------------
// External Intelligence Provider Abstraction
// ---------------------------------------------------------------------------

export type ExternalProviderType =
  | 'cloud_model'
  | 'agent'
  | 'api'
  | 'tool';

/**
 * Generic external provider interface.
 * Saturday core does NOT depend on any single AI provider or API company.
 */
export interface ExternalIntelligenceProvider {
  id: string;
  name: string;
  type: ExternalProviderType;
  isAvailable(): Promise<boolean>;
  getCapabilities(): Promise<string[]> | string[];
  execute(request: ExternalRequest): Promise<ExternalResponse>;
  getHealth?(): ProviderHealth;
}

// ---------------------------------------------------------------------------
// Provider Health Tracking
// ---------------------------------------------------------------------------

export interface ProviderHealth {
  available: boolean;
  lastSuccess?: number;
  lastFailure?: number;
  latencyMs?: number;
  errorRate: number;
}

// ---------------------------------------------------------------------------
// Authentication & Credential Architecture
// ---------------------------------------------------------------------------

export type AuthProviderType = 'oauth' | 'api_key' | 'device' | 'session';

export interface AuthSession {
  serviceId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes: string[];
  userEmail?: string;
}

export type IntegrationStatus = 'connected' | 'disconnected' | 'expired' | 'error';

export interface ConnectedService {
  id: string;
  name: string;
  description: string;
  icon?: string;
  status: IntegrationStatus;
  authType: AuthProviderType;
  permissions: string[];
  lastSync?: number;
  userEmail?: string;
}

// ---------------------------------------------------------------------------
// Agent Communication Layer
// ---------------------------------------------------------------------------

export interface AgentTask {
  id: string;
  objective: string;
  inputs?: Record<string, unknown>;
  requiredCapabilities: string[];
  constraints?: Record<string, unknown>;
  deadline?: number;
}

export type AgentResponseStatus =
  | 'accepted'
  | 'running'
  | 'completed'
  | 'failed'
  | 'requires_user_input';

export interface AgentResponse {
  taskId: string;
  status: AgentResponseStatus;
  result?: unknown;
  evidence?: unknown;
  actionsTaken?: unknown[];
  error?: string;
}

export type AgentPermissionScope = 'once' | 'session' | 'persistent';

/**
 * Explicit permissions granted to an external agent.
 * Agents NEVER receive blanket phone or capability access.
 */
export interface AgentPermission {
  agentId: string;
  capability: string;
  scope: AgentPermissionScope;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  supportedProtocols: string[];
  requiresAuth: boolean;
  cost?: string;
  isAvailable(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Model Context Protocol (MCP) Foundation
// ---------------------------------------------------------------------------

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ---------------------------------------------------------------------------
// Data Boundary & Minimization
// ---------------------------------------------------------------------------

export interface DataBoundaryCheck {
  allowed: boolean;
  reason?: string;
  requiresUserApproval: boolean;
  minimizedData?: unknown;
}

// ---------------------------------------------------------------------------
// Unified Execution Task & Routing
// ---------------------------------------------------------------------------

export type ExecutionTarget =
  | 'LOCAL'
  | 'EXTERNAL_MODEL'
  | 'EXTERNAL_AGENT'
  | 'ANDROID_ACTION'
  | 'API'
  | 'MULTI_STEP';

export interface ExtendedRoutingDecision {
  target: ExecutionTarget;
  providerId?: string;
  agentId?: string;
  reason: string;
  confidence: number;
  requirements: TaskRequirements;
}
