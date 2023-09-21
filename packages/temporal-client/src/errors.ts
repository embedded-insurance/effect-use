import * as S from '@effect/schema/Schema'

export const WorkflowNotFoundError = S.extend(
  S.struct({
    _tag: S.literal('WorkflowNotFoundError'),
    /**
     * The workflowId that wasn't found
     */
    workflowId: S.string,
    /**
     * The namespace workflow wasn't found in
     */
    namespace: S.string,
  }),
  S.partial(
    S.struct({
      /**
       * The runId that was provided to `signal`, if any
       */
      runId: S.optional(S.string),
      /**
       * The correlationId that was provided to `signal`, if any
       */
      correlationId: S.optional(S.string),
    })
  )
)
export type WorkflowNotFoundError = S.Schema.To<typeof WorkflowNotFoundError>

export const WorkflowExecutionAlreadyStartedError = S.struct({
  _tag: S.literal('WorkflowExecutionAlreadyStartedError'),
  workflowId: S.string,
  workflowType: S.string,
})
export type WorkflowExecutionAlreadyStartedError = S.Schema.To<
  typeof WorkflowExecutionAlreadyStartedError
>
