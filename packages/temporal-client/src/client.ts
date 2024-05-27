import {
  Workflow,
  WorkflowExecutionDescription,
  WorkflowHandle,
  WorkflowNotFoundError as TemporalWorkflowNotFoundError,
  WorkflowExecutionAlreadyStartedError as TemporalWorkflowExecutionAlreadyStartedError,
  WorkflowSignalWithStartOptions,
  Client,
  Connection,
  QueryNotRegisteredError,
  QueryRejectedError,
  WorkflowStartOptions,
} from '@temporalio/client'
import { Effect, Context, Layer, pipe, Scope } from 'effect'
import * as S from '@effect/schema/Schema'
import { TemporalConfig, TemporalConfigTag } from '@effect-use/temporal-config'
import {
  WorkflowExecutionAlreadyStartedError,
  WorkflowNotFoundError,
} from './errors'
import { ConnectionLive, TemporalConnection } from './connection'
import { CommonWorkflowOptions } from './types'

export type TemporalClient = Client
export const TemporalClient = Context.GenericTag<TemporalClient>(
  '@effect-use.temporal-client/TemporalClient'
)

export const buildClient = Effect.flatMap(
  Effect.all([TemporalConnection, TemporalConfigTag] as const),
  ([connection, config]) =>
    Effect.provide(
      TemporalClient,
      Layer.effect(
        TemporalClient,
        Effect.try({
          try: () => new Client({ connection, namespace: config.namespace }),
          catch: (e) => e,
        })
      )
    )
)

export const makeClient = (args: {
  connection: TemporalConnection
  config: TemporalConfig
}) =>
  Effect.try({
    try: () =>
      new Client({
        connection: args.connection,
        namespace: args.config.namespace,
      }),
    catch: (e) => e,
  })

export const SignalWithStartInput = S.extend(
  S.Struct({
    workflowType: S.String,
    workflowId: S.String,
    taskQueue: S.String,
    signal: S.String,
    signalArgs: S.Array(S.Unknown),
  }),
  CommonWorkflowOptions
)

export type SignalWithStartInput = S.Schema.Type<typeof SignalWithStartInput>

export const SignalWithStartOutput = pipe(
  S.Struct({
    workflowId: S.String,
    signaledRunId: S.String,
  }),
  S.description(
    "Signals a running workflow or starts it if it doesn't exist. Echoes the workflowId used to make the request and the run ID of the workflow that was signaled."
  )
)
export type SignalWithStartOutput = S.Schema.Type<typeof SignalWithStartOutput>

export const SignalWithStartError = S.Unknown
export type SignalWithStartError = S.Schema.Type<typeof SignalWithStartError>

export const signalWithStart = (
  args: SignalWithStartInput
): Effect.Effect<SignalWithStartOutput, SignalWithStartError, TemporalClient> =>
  Effect.flatMap(TemporalClient, (client) =>
    pipe(
      Effect.tryPromise(() =>
        client.workflow.signalWithStart(
          args.workflowType,
          args as unknown as WorkflowSignalWithStartOptions
        )
      ),
      Effect.map((x) => ({
        workflowId: x.workflowId,
        signaledRunId: x.signaledRunId,
      }))
    )
  )

/**
 * Returns a handle to a running workflow or fails if the workflow is not found
 * @param args
 */
export const getWorkflowHandle = <T extends Workflow = Workflow>(args: {
  workflowId: string
  runId?: string
}): Effect.Effect<
  WorkflowHandle<T>,
  TemporalWorkflowNotFoundError | unknown,
  TemporalClient
> =>
  Effect.flatMap(TemporalClient, (client) =>
    pipe(
      Effect.sync(() => client.workflow.getHandle(args.workflowId, args.runId)),
      Effect.bindTo('handle'),
      Effect.flatMap(({ handle }) =>
        pipe(
          Effect.tryPromise<
            WorkflowExecutionDescription,
            TemporalWorkflowNotFoundError | unknown
          >({
            try: () => handle.describe(),
            catch: (e) => e,
          }),
          Effect.map(() => handle)
        )
      )
    )
  )

export const SignalWorkflowInput = S.extend(
  S.Struct({
    workflowId: S.String,
    runId: S.optional(S.String),
    signal: S.String,
    signalArgs: S.Array(S.Unknown),
  }),
  S.partial(S.Struct({ correlationId: S.String }))
)
export type SignalWorkflowInput = S.Schema.Type<typeof SignalWorkflowInput>
export const SignalWorkflowOutput = S.extend(
  S.Struct({
    workflowId: S.String,
    runId: S.String,
    taskQueue: S.String,
  }),
  S.partial(
    S.Struct({
      /**
       * The correlationId that was provided to `signal`, if any
       * Can be used to correlate inputs and outputs when broadcasting signals with signalBatch
       */
      correlationId: S.optional(S.String),
    })
  )
)
export type SignalWorkflowOutput = S.Schema.Type<typeof SignalWorkflowOutput>

export const SignalWorkflowError = S.Union(WorkflowNotFoundError, S.Unknown)
export type SignalWorkflowError = S.Schema.Type<typeof SignalWorkflowError>

/**
 * Sends a message to a running workflow
 * Fails if the workflow is not found
 * Returns the runId of the workflow that was signaled
 * @param args
 */
export const signal = (
  args: SignalWorkflowInput
): Effect.Effect<SignalWorkflowOutput, SignalWorkflowError, TemporalClient> =>
  Effect.flatMap(TemporalClient, (client) =>
    pipe(
      Effect.Do,
      Effect.bind('handle', () =>
        Effect.try(() => client.workflow.getHandle(args.workflowId, args.runId))
      ),
      Effect.bind('executionDescription', ({ handle }) =>
        Effect.tryPromise(() => handle.describe())
      ),
      Effect.bind('result', ({ handle }) =>
        Effect.tryPromise(() => handle.signal(args.signal, ...args.signalArgs))
      ),
      Effect.map(({ result, executionDescription }) => ({
        workflowId: executionDescription.workflowId,
        runId: executionDescription.runId,
        taskQueue: executionDescription.taskQueue,
        correlationId: args.correlationId,
      })),
      Effect.mapError((e) => {
        if (e instanceof TemporalWorkflowNotFoundError) {
          return new WorkflowNotFoundError({
            workflowId: args.workflowId,
            runId: args.runId,
            // TODO. Verify this is the correct source of truth for the namespace that was used for this signal
            namespace: client.options.namespace,
            correlationId: args.correlationId,
          })
        }
        return e
      })
    )
  )

export const StartWorkflowInput = S.extend(
  S.Struct({
    workflowId: S.String,
    workflowType: S.String,
    args: S.optional(S.Array(S.Unknown)),
    taskQueue: S.String,
  }),
  CommonWorkflowOptions
)
export type StartWorkflowInput = S.Schema.Type<typeof StartWorkflowInput>

export const StartWorkflowOutput = S.Struct({
  runId: S.String,
})
export type StartWorkflowOutput = S.Schema.Type<typeof StartWorkflowOutput>

export const StartWorkflowError = S.Union(
  WorkflowExecutionAlreadyStartedError,
  S.Unknown
)
export type StartWorkflowError = S.Schema.Type<typeof StartWorkflowError>

export const startWorkflow = (
  args: StartWorkflowInput
): Effect.Effect<StartWorkflowOutput, StartWorkflowError, TemporalClient> =>
  Effect.flatMap(TemporalClient, (client) =>
    pipe(
      Effect.tryPromise({
        try: () =>
          client.workflow.start(
            args.workflowType,
            // https://github.com/Effect-TS/schema/issues/305
            args as unknown as WorkflowStartOptions
          ),
        catch: (e: TemporalWorkflowExecutionAlreadyStartedError | unknown) => {
          if (e instanceof TemporalWorkflowExecutionAlreadyStartedError) {
            return new WorkflowExecutionAlreadyStartedError(e)
          }
          return e
        },
      }),
      Effect.map((x) => ({ runId: x.firstExecutionRunId }))
    )
  )

export const query = (args: {
  workflowId: string
  queryName: string
  queryArgs: unknown[]
}) =>
  pipe(
    getWorkflowHandle({ workflowId: args.workflowId }),
    Effect.flatMap((workflow) =>
      Effect.tryPromise({
        try: () => workflow.query(args.queryName, ...args.queryArgs),
        catch: (e: QueryNotRegisteredError | QueryRejectedError | unknown) => e,
      })
    )
  )

export const createTemporalClientLayer = (
  config: TemporalConfig
): Layer.Layer<Client | Connection | TemporalConfig, unknown, Scope.Scope> =>
  pipe(
    Layer.effect(TemporalClient, buildClient),
    Layer.provideMerge(ConnectionLive),
    Layer.provideMerge(Layer.effect(TemporalConfigTag, Effect.succeed(config)))
  )
