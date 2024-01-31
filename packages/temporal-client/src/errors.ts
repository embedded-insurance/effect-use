import * as S from '@effect/schema/Schema'

export class WorkflowNotFoundError extends S.TaggedError<WorkflowNotFoundError>()(
  'WorkflowNotFoundError',
  {
    /**
     * The workflowId that wasn't found
     */
    workflowId: S.string,
    /**
     * The namespace workflow wasn't found in
     */
    namespace: S.string,
    /**
     * The runId that was provided to `signal`, if any
     */
    runId: S.optional(S.string),
    /**
     * The correlationId that was provided to `signal`, if any
     */
    correlationId: S.optional(S.string),
  }
) {}

export class WorkflowExecutionAlreadyStartedError extends S.TaggedError<WorkflowExecutionAlreadyStartedError>()(
  'WorkflowExecutionAlreadyStartedError',
  {
    workflowId: S.string,
    workflowType: S.string,
  }
) {}
