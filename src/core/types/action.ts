/**
 * Action types for Saturday Phase 2.
 * Platform-agnostic action lifecycle, capability model, and permission system.
 * The LLM proposes structured ActionIntents — the engine validates and executes them.
 */

// ---------------------------------------------------------------------------
// Action State Machine
// ---------------------------------------------------------------------------

/** Lifecycle states for an action */
export type ActionState =
  | 'PLANNED'
  | 'VALIDATING'
  | 'AWAITING_PERMISSION'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/** Risk classification for actions */
export type RiskLevel = 'low' | 'medium' | 'high';

// ---------------------------------------------------------------------------
// Action Intent (what the LLM proposes — never raw Android calls)
// ---------------------------------------------------------------------------

/**
 * A structured, validated action proposal.
 * The LLM emits these; the ActionEngine decides whether and how to execute.
 */
export interface ActionIntent {
  /** Unique intent identifier */
  id: string;
  /** Capability to invoke, e.g. 'app.launch', 'clipboard.write' */
  capability: string;
  /** Capability-specific parameters */
  params: Record<string, unknown>;
  /** Risk level for permission decisions */
  riskLevel: RiskLevel;
  /** Whether user must explicitly confirm */
  requiresConfirmation: boolean;
  /** Human-readable description, e.g. "Open YouTube" */
  description: string;
}

// ---------------------------------------------------------------------------
// Action (full lifecycle record)
// ---------------------------------------------------------------------------

/** Result after capability execution */
export interface ActionResult {
  /** Whether the action succeeded */
  success: boolean;
  /** Optional result data */
  data?: Record<string, unknown>;
  /** Error description if failed */
  error?: string;
  /** Timestamp of verification */
  verifiedAt?: number;
}

/** Full action lifecycle record */
export interface Action {
  /** Unique action identifier */
  id: string;
  /** The intent that created this action */
  intent: ActionIntent;
  /** Current lifecycle state */
  state: ActionState;
  /** Execution result (set after EXECUTING) */
  result?: ActionResult;
  /** Creation timestamp */
  createdAt: number;
  /** Last state-change timestamp */
  updatedAt: number;
  /** Error description if in FAILED state */
  error?: string;
}

// ---------------------------------------------------------------------------
// Capability Model
// ---------------------------------------------------------------------------

/** Broad categories for capabilities */
export type CapabilityCategory =
  | 'device'
  | 'app'
  | 'communication'
  | 'media'
  | 'system'
  | 'ui';

/** Static definition of what a capability can do */
export interface CapabilityDefinition {
  /** Unique identifier, e.g. 'app.launch' */
  id: string;
  /** Human-readable name, e.g. "Launch App" */
  name: string;
  /** Category for grouping */
  category: CapabilityCategory;
  /** Default risk level */
  riskLevel: RiskLevel;
  /** Android permissions required */
  requiredPermissions: string[];
  /** Platform constraint */
  platform: 'android' | 'ios' | 'any';
}

/** A runnable capability handler */
export interface Capability {
  /** Static definition */
  definition: CapabilityDefinition;
  /** Execute the capability with given params */
  execute(params: Record<string, unknown>): Promise<ActionResult>;
  /** Check if this capability is currently available */
  isAvailable(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Action Plan (multi-step decomposition)
// ---------------------------------------------------------------------------

/** A plan composed of sequential action steps */
export interface ActionPlan {
  /** Ordered steps to execute */
  steps: ActionIntent[];
  /** Human-readable plan description */
  description: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Result of validating an ActionIntent */
export interface ValidationResult {
  /** Whether the intent is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/** Result of post-execution verification */
export interface VerificationResult {
  /** Whether the result was verified */
  verified: boolean;
  /** Human-readable detail */
  details: string;
}

// ---------------------------------------------------------------------------
// Permission Check
// ---------------------------------------------------------------------------

/** Result of checking permissions for an action */
export interface PermissionCheckResult {
  /** Whether all permissions are granted */
  granted: boolean;
  /** Permissions that are missing */
  missing: string[];
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

/** Callback for action state changes */
export type ActionStateCallback = (action: Action) => void;
