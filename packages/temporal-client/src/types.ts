import * as S from '@effect/schema/Schema'
import { pipe } from 'effect'

export const MsStr = S.TemplateLiteral(
  S.Number,
  S.Literal('y', 'w', 'd', 'h', 'm', 's', 'ms')
)

export const SearchAttributes = S.Record(
  S.String,
  S.Union(
    S.Array(S.String),
    S.Array(S.Number),
    S.Array(S.Boolean)
    // S.array(S.Date)
  )
)

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

export const WorkflowDurationOptions = S.Struct({
  /**
   * The time after which workflow run is automatically terminated by Temporal service. Do not
   * rely on run timeout for business level timeouts. It is preferred to use in workflow timers
   * for this purpose.
   *
   * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
   */
  workflowRunTimeout: S.optional(S.Union(MsStr, S.Number)),

  /**
   *
   * The time after which workflow execution (which includes run retries and continue as new) is
   * automatically terminated by Temporal service. Do not rely on execution timeout for business
   * level timeouts. It is preferred to use in workflow timers for this purpose.
   *
   * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
   */
  workflowExecutionTimeout: S.optional(S.Union(MsStr, S.Number)),

  /**
   * Maximum execution time of a single workflow task. Default is 10 seconds.
   *
   * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
   */
  workflowTaskTimeout: S.optional(S.Union(MsStr, S.Number)),
})

export const BaseWorkflowOptions = S.Struct({
  workflowIdReusePolicy: S.optional(S.Enums(WorkflowIdReusePolicy)),
  /**
   * Optional cron schedule for Workflow. If a cron schedule is specified, the Workflow will run as a cron based on the
   * schedule. The scheduling will be based on UTC time. The schedule for the next run only happens after the current
   * run is completed/failed/timeout. If a RetryPolicy is also supplied, and the Workflow failed or timed out, the
   * Workflow will be retried based on the retry policy. While the Workflow is retrying, it won't schedule its next run.
   * If the next schedule is due while the Workflow is running (or retrying), then it will skip that schedule. Cron
   * Workflow will not stop until it is terminated or cancelled (by returning temporal.CanceledError).
   * https://crontab.guru/ is useful for testing your cron expressions.
   */
  chronSchedule: S.optional(S.String),

  /**
   * Specifies additional non-indexed information to attach to the Workflow Execution. The values can be anything that
   * is serializable by {@link DataConverter}.
   */

  memo: S.optional(S.Record(S.String, S.Unknown)),
  /**
   * Specifies additional indexed information to attach to the Workflow Execution. More info:
   * https://docs.temporal.io/docs/typescript/search-attributes
   *
   * Values are always converted using {@link JsonPayloadConverter}, even when a custom data converter is provided.
   */
  searchAttributes: S.optional(SearchAttributes),

  followRuns: S.optional(S.Boolean),

  retry: S.optional(
    S.Struct({
      /**
       * Coefficient used to calculate the next retry interval.
       * The next retry interval is previous interval multiplied by this coefficient.
       * @minimum 1
       * @default 2
       */
      backoffCoefficient: S.optional(
        pipe(S.Number, S.greaterThanOrEqualTo(1)),
        { default: () => 2 }
      ),

      /**
       * Interval of the first retry.
       * If coefficient is 1 then it is used for all retries
       * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
       * @default 1 second
       */
      initialInterval: S.optional(S.Union(MsStr, S.Number)),

      /**
       * Maximum number of attempts. When exceeded, retries stop (even if {@link ActivityOptions.scheduleToCloseTimeout}
       * hasn't been reached).
       *
       * @default Infinity
       */
      maximumAttempts: S.optional(S.Number),

      /**
       * Maximum interval between retries.
       * Exponential backoff leads to interval increase.
       * This value is the cap of the increase.
       *
       * @default 100x of {@link initialInterval}
       * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
       */
      maximumInterval: S.optional(S.Union(MsStr, S.Number)),

      /**
       * List of application failures types to not retry.
       */
      nonRetryableErrorTypes: S.optional(S.Array(S.String)),
    })
  ),
})

export const CommonWorkflowOptions = S.extend(
  BaseWorkflowOptions,
  WorkflowDurationOptions
)
