import {
  Payload,
  PayloadConverter as TemporalPayloadConverter,
  ValueError,
} from '@temporalio/workflow'
import * as Effect from '@effect/io/Effect'
import * as Context from '@effect/data/Context'
import * as S from '@effect/schema/Schema'
import { identity, pipe } from '@effect/data/Function'
import {
  startWorkflow,
  signal,
  signalWithStart,
  SignalWithStartInput,
  SignalWithStartError,
  SignalWithStartOutput,
  SignalWorkflowInput,
  SignalWorkflowError,
  SignalWorkflowOutput,
  StartWorkflowInput,
  StartWorkflowError,
  StartWorkflowOutput,
  TemporalClient,
} from './client'

export const StartWorkflowBatchInput = S.array(StartWorkflowInput)
export type StartWorkflowBatchInput = S.Schema.To<
  typeof StartWorkflowBatchInput
>

export const StartWorkflowBatchOutput = S.struct({
  successes: S.array(StartWorkflowOutput),
  failures: S.array(StartWorkflowError),
})
export type StartWorkflowBatchOutput = S.Schema.To<
  typeof StartWorkflowBatchOutput
>

/**
 * Starts workflows in parallel.
 * Returns successes and failures as output.
 * @param args
 */
export const startWorkflowBatch = (
  args: StartWorkflowBatchInput
): Effect.Effect<TemporalClient, never, StartWorkflowBatchOutput> =>
  pipe(
    Effect.partition(args.map(startWorkflow), identity, {
      batching: true,
      concurrency: 'unbounded',
    }),
    Effect.map(([failures, successes]) => ({ successes, failures }))
    // We can do more for a stronger batch API
    // https://effect.website/docs/guide/batching-caching
  )

export const SignalBatchInput = S.array(SignalWorkflowInput)
export type SignalBatchInput = S.Schema.To<typeof SignalBatchInput>

export const SignalBatchOutput = S.struct({
  successes: S.array(SignalWorkflowOutput),
  failures: S.array(SignalWorkflowError),
})
export type SignalBatchOutput = S.Schema.To<typeof SignalBatchOutput>

/**
 * Runs signals in parallel.
 * Returns successes and failures.
 * @param args
 */
export const signalBatch = (
  args: SignalBatchInput
): Effect.Effect<TemporalClient, never, SignalBatchOutput> =>
  pipe(
    Effect.partition(args.map(signal), identity, {
      batching: true,
      concurrency: 'unbounded',
    }),
    Effect.map(([failures, successes]) => ({ successes, failures }))
    // We can do more for a stronger batch API
    // https://effect.website/docs/guide/batching-caching
  )

export const SignalWithStartBatchInput = S.array(SignalWithStartInput)
export type SignalWithStartBatchInput = S.Schema.To<
  typeof SignalWithStartBatchInput
>

export const SignalWithStartBatchOutput = S.struct({
  successes: S.array(SignalWithStartOutput),
  failures: S.array(SignalWithStartError),
})
export type SignalWithStartBatchOutput = S.Schema.To<
  typeof SignalWithStartBatchOutput
>

/**
 * Signals with starts in parallel.
 * Returns successes and failures.
 * @param args
 */
export const signalWithStartBatch = (
  args: SignalWithStartBatchInput
): Effect.Effect<TemporalClient, never, SignalWithStartBatchOutput> =>
  pipe(
    Effect.partition(args.map(signalWithStart), identity, {
      batching: true,
      concurrency: 'unbounded',
    }),
    Effect.map(([failures, successes]) => ({ successes, failures }))
    // We can do more for a stronger batch API
    // https://effect.website/docs/guide/batching-caching
  )

export type PayloadConverter = TemporalPayloadConverter
export const PayloadConverter = Context.Tag<PayloadConverter>(
  '@temporalio/workflow.PayloadConverter'
)

export const getPayloadConverter = Effect.flatMap(TemporalClient, (client) =>
  Effect.try(() => client.options.loadedDataConverter.payloadConverter)
)

export const convertPayload = (
  payload: any
): Effect.Effect<PayloadConverter, ValueError | unknown, Payload> =>
  Effect.flatMap(PayloadConverter, (c) =>
    Effect.try({
      try: () => c.toPayload(payload),
      catch: (e) => {
        if (e instanceof Error && e.name === 'ValueError') {
          return e as ValueError
        }
        return e
      },
    })
  )

/**
 * Note: You may prefer `signalBatch`.
 *
 * Wraps Temporal's batch signal API.
 * Creates a job with the specified arguments.
 *
 * You should probably use `signalBatch` because this API appears to lack:
 * - Feedback on whether signals were successful
 * - Support for a mix of signal types
 * - One signal type, different payloads
 * @param args
 */
export const batchSignal = (args: {
  namespace: string
  jobId: string
  signal: string
  args: Array<{ payload: any[]; workflowId: string; runId?: string }>
}) =>
  Effect.flatMap(TemporalClient, (client) => {
    const conversions = args.args.map((x) =>
      pipe(
        Effect.map(convertPayload(x.payload), (encoded) => ({
          payload: encoded,
          workflowId: x.workflowId,
          runId: x.runId,
        })),
        Effect.mapError((e) => ({
          _tag: 'BatchSignalItemDataEncodingError',
          error: e,
          workflowId: x.workflowId,
          runId: x.runId,
        })),
        Effect.tapError((e) => Effect.logError('Whooops'))
      )
    )

    return pipe(
      Effect.partition(conversions, identity, {
        batching: true,
        concurrency: 'unbounded',
      }),
      Effect.flatMap(([failedEncodings, signals]) => {
        const identifiers = signals.map((x) => ({
          workflowId: x.workflowId,
          runId: x.runId || null,
        }))
        return pipe(
          Effect.tryPromise(() =>
            client.workflowService.startBatchOperation({
              reason: 'testing',
              namespace: args.namespace,
              jobId: args.jobId,
              executions: identifiers,
              signalOperation: {
                signal: args.signal,
                identity: 'waas-operator@v0.0.0',
                input: {
                  payloads: signals.map((x) => x.payload),
                },
              },
            })
          ),
          Effect.map((x) => ({
            failures: failedEncodings,
            successes: identifiers,
            result: x,
          }))
        )
      }),
      // uses the payload converter from this client
      Effect.provideServiceEffect(PayloadConverter, getPayloadConverter)
    )
  })

export const GoogleProtobufTimestamp = S.struct({
  seconds: S.string,
  nanos: S.number,
})

export const DateFromGoogleProtobufTimestamp = pipe(
  GoogleProtobufTimestamp,
  S.transform(
    S.ValidDateFromSelf,
    (x) => new Date(Number(x.seconds) * 1000 + x.nanos / 1000000),
    (x) => ({
      seconds: String(x.getTime() / 1000),
      nanos: x.getMilliseconds() * 1000000,
    })
  )
)

export const BatchOperationResult = S.struct({
  operationType: S.union(S.literal('BATCH_OPERATION_TYPE_SIGNAL'), S.string),
  jobId: S.string,
  state: S.literal(
    'BATCH_OPERATION_STATE_UNSPECIFIED',
    'BATCH_OPERATION_STATE_RUNNING',
    'BATCH_OPERATION_STATE_COMPLETED',
    'BATCH_OPERATION_STATE_FAILED'
  ),
  startTime: DateFromGoogleProtobufTimestamp,
  closeTime: DateFromGoogleProtobufTimestamp,
  totalOperationCount: S.numberFromString(S.string),
  completeOperationCount: S.numberFromString(S.string),
  identity: S.string,
  reason: S.string,
})

export const describeBatchOperation = (args: {
  namespace: string
  jobId: string
}) =>
  Effect.flatMap(TemporalClient, (client) =>
    pipe(
      Effect.tryPromise(() =>
        client.workflowService.describeBatchOperation({
          namespace: args.namespace,
          jobId: args.jobId,
        })
      ),
      Effect.flatMap((x) => pipe(x.toJSON(), S.parse(BatchOperationResult)))
    )
  )
