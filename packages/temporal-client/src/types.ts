import * as S from '@effect/schema/Schema'
import { pipe } from 'effect'

// Avoid importing the proto implementation to reduce workflow bundle size
// Copied from temporal.api.enums.v1.WorkflowIdReusePolicy
/**
 * Concept: {@link https://docs.temporal.io/concepts/what-is-a-workflow-id-reuse-policy/ | Workflow Id Reuse Policy}
 *
 * Whether a Workflow can be started with a Workflow Id of a Closed Workflow.
 *
 * *Note: A Workflow can never be started with a Workflow Id of a Running Workflow.*
 */
export enum WorkflowIdReusePolicy {
  /**
   * No need to use this.
   *
   * (If a `WorkflowIdReusePolicy` is set to this, or is not set at all, the default value will be used.)
   */
  WORKFLOW_ID_REUSE_POLICY_UNSPECIFIED = 0,

  /**
   * The Workflow can be started if the previous Workflow is in a Closed state.
   * @default
   */
  WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE = 1,

  /**
   * The Workflow can be started if the previous Workflow is in a Closed state that is not Completed.
   */
  WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY = 2,

  /**
   * The Workflow cannot be started.
   */
  WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE = 3,

  /**
   * Terminate the current workflow if one is already running.
   */
  WORKFLOW_ID_REUSE_POLICY_TERMINATE_IF_RUNNING = 4,
}

export const WorkflowDurationOptions = S.struct({
  /**
   * The time after which workflow run is automatically terminated by Temporal service. Do not
   * rely on run timeout for business level timeouts. It is preferred to use in workflow timers
   * for this purpose.
   *
   * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
   */
  workflowRunTimeout: S.optional(S.union(S.string, S.number)),

  /**
   *
   * The time after which workflow execution (which includes run retries and continue as new) is
   * automatically terminated by Temporal service. Do not rely on execution timeout for business
   * level timeouts. It is preferred to use in workflow timers for this purpose.
   *
   * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
   */
  workflowExecutionTimeout: S.optional(S.union(S.string, S.number)),

  /**
   * Maximum execution time of a single workflow task. Default is 10 seconds.
   *
   * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
   */
  workflowTaskTimeout: S.optional(S.union(S.string, S.number)),
})

export const BaseWorkflowOptions = S.struct({
  workflowIdReusePolicy: S.optional(S.enums(WorkflowIdReusePolicy)),
  retry: S.optional(
    S.struct({
      /**
       * Coefficient used to calculate the next retry interval.
       * The next retry interval is previous interval multiplied by this coefficient.
       * @minimum 1
       * @default 2
       */
      backoffCoefficient: S.optional(
        pipe(S.number, S.greaterThanOrEqualTo(1)),
        { default: () => 2 }
      ),

      /**
       * Interval of the first retry.
       * If coefficient is 1 then it is used for all retries
       * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
       * @default 1 second
       */
      initialInterval: S.optional(S.union(S.string, S.number)),

      /**
       * Maximum number of attempts. When exceeded, retries stop (even if {@link ActivityOptions.scheduleToCloseTimeout}
       * hasn't been reached).
       *
       * @default Infinity
       */
      maximumAttempts: S.optional(S.number),

      /**
       * Maximum interval between retries.
       * Exponential backoff leads to interval increase.
       * This value is the cap of the increase.
       *
       * @default 100x of {@link initialInterval}
       * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
       */
      maximumInterval: S.optional(S.union(S.string, S.number)),

      /**
       * List of application failures types to not retry.
       */
      nonRetryableErrorTypes: S.optional(S.array(S.string)),
    })
  ),
})

export const CommonWorkflowOptions = S.extend(
  BaseWorkflowOptions,
  WorkflowDurationOptions
)
