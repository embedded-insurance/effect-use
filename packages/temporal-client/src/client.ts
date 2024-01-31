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
export const TemporalClient = Context.Tag<TemporalClient>(
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
  S.struct({
    workflowType: S.string,
    workflowId: S.string,
    taskQueue: S.string,
    signal: S.string,
    signalArgs: S.array(S.unknown),
  }),
  CommonWorkflowOptions
)

export type SignalWithStartInput = S.Schema.To<typeof SignalWithStartInput>

export const SignalWithStartOutput = pipe(
  S.struct({
    workflowId: S.string,
    signaledRunId: S.string,
  }),
  S.description(
    "Signals a running workflow or starts it if it doesn't exist. Echoes the workflowId used to make the request and the run ID of the workflow that was signaled."
  )
)
export type SignalWithStartOutput = S.Schema.To<typeof SignalWithStartOutput>

export const SignalWithStartError = S.unknown
export type SignalWithStartError = S.Schema.To<typeof SignalWithStartError>

export const signalWithStart = (
  args: SignalWithStartInput
): Effect.Effect<TemporalClient, SignalWithStartError, SignalWithStartOutput> =>
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
  TemporalClient,
  TemporalWorkflowNotFoundError | unknown,
  WorkflowHandle<T>
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
  S.struct({
    workflowId: S.string,
    runId: S.optional(S.string),
    signal: S.string,
    signalArgs: S.array(S.unknown),
  }),
  S.partial(S.struct({ correlationId: S.string }))
)
export type SignalWorkflowInput = S.Schema.To<typeof SignalWorkflowInput>
export const SignalWorkflowOutput = S.extend(
  S.struct({
    workflowId: S.string,
    runId: S.string,
    taskQueue: S.string,
  }),
  S.partial(
    S.struct({
      /**
       * The correlationId that was provided to `signal`, if any
       * Can be used to correlate inputs and outputs when broadcasting signals with signalBatch
       */
      correlationId: S.optional(S.string),
    })
  )
)
export type SignalWorkflowOutput = S.Schema.To<typeof SignalWorkflowOutput>

export const SignalWorkflowError = S.union(WorkflowNotFoundError, S.unknown)
export type SignalWorkflowError = S.Schema.To<typeof SignalWorkflowError>

/**
 * Sends a message to a running workflow
 * Fails if the workflow is not found
 * Returns the runId of the workflow that was signaled
 * @param args
 */
export const signal = (
  args: SignalWorkflowInput
): Effect.Effect<TemporalClient, SignalWorkflowError, SignalWorkflowOutput> =>
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
  S.struct({
    workflowId: S.string,
    workflowType: S.string,
    args: S.optional(S.array(S.unknown)),
    taskQueue: S.string,
  }),
  CommonWorkflowOptions
)
export type StartWorkflowInput = S.Schema.To<typeof StartWorkflowInput>

export const StartWorkflowOutput = S.struct({
  runId: S.string,
})
export type StartWorkflowOutput = S.Schema.To<typeof StartWorkflowOutput>

export const StartWorkflowError = S.union(
  WorkflowExecutionAlreadyStartedError,
  S.unknown
)
export type StartWorkflowError = S.Schema.To<typeof StartWorkflowError>

export const startWorkflow = (
  args: StartWorkflowInput
): Effect.Effect<TemporalClient, StartWorkflowError, StartWorkflowOutput> =>
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
): Layer.Layer<Scope.Scope, unknown, Client | Connection | TemporalConfig> =>
  pipe(
    Layer.effect(TemporalClient, buildClient),
    Layer.provideMerge(ConnectionLive),
    Layer.provideMerge(Layer.effect(TemporalConfigTag, Effect.succeed(config)))
  )
