import * as S from '@effect/schema/Schema'

export class WorkflowNotFoundError extends S.TaggedError<WorkflowNotFoundError>()(
  'WorkflowNotFoundError',
  {
    /**
     * The workflowId that wasn't found
     */
    workflowId: S.String,
    /**
     * The namespace workflow wasn't found in
     */
    namespace: S.String,
    /**
     * The runId that was provided to `signal`, if any
     */
    runId: S.optional(S.String),
    /**
     * The correlationId that was provided to `signal`, if any
     */
    correlationId: S.optional(S.String),
  }
) {}

export class WorkflowExecutionAlreadyStartedError extends S.TaggedError<WorkflowExecutionAlreadyStartedError>()(
  'WorkflowExecutionAlreadyStartedError',
  {
    workflowId: S.String,
    workflowType: S.String,
  }
) {}
