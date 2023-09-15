import { pipe } from '@effect/data/Function'
import * as Effect from '@effect/io/Effect'
import * as FiberRef from '@effect/io/FiberRef'
import * as FiberRefs from '@effect/io/FiberRefs'
import * as Logger from '@effect/io/Logger'
import * as Option from '@effect/data/Option'
import * as List from '@effect/data/List'
import * as HashMap from '@effect/data/HashMap'
import * as Cause from '@effect/io/Cause'

type LogMeta = Record<string, string>

const logMeta = FiberRef.unsafeMake<LogMeta>({})

export const logTrace = (message: string, data: LogMeta) =>
  Effect.locally(logMeta, data)(Effect.logTrace(message))

export const logDebug = (message: string, data: LogMeta) =>
  Effect.locally(logMeta, data)(Effect.logDebug(message))

export const logInfo = (message: string, data: LogMeta) =>
  Effect.locally(logMeta, data)(Effect.logInfo(message))

export const logWarning = (message: string, data: LogMeta) =>
  Effect.locally(logMeta, data)(Effect.logWarning(message))

export const logError = (message: string, data: LogMeta) =>
  Effect.locally(logMeta, data)(Effect.logError(message))

export const logFatal = (message: string, data: LogMeta) =>
  Effect.locally(logMeta, data)(Effect.logFatal(message))

const defaultLogFunction = (a: any) => console.log(JSON.stringify(a))

export const customLogger = (logFn: (a: any) => void = defaultLogFunction) =>
  Logger.make<unknown, void>(
    ({
      fiberId,
      logLevel,
      message,
      cause,
      context,
      spans,
      annotations,
      date,
    }) => {
      const meta = FiberRefs.getOrDefault(context, logMeta)
      const sp = List.head(spans)
      const span = Option.isSome(sp) ? sp.value : undefined
      const parent = pipe(List.tail(spans), Option.flatMap(List.head))
      const parentSpan = Option.isSome(parent) ? parent.value : undefined

      const anno = HashMap.reduce(annotations, {}, (a, v, k) => ({
        ...a,
        [k]: v,
      }))
      logFn({
        annotations: {
          ...anno,
        },
        timestamp: new Date(date).toISOString(),
        level: logLevel.label,
        ...(Cause.isEmpty(cause) ? undefined : { cause }),
        message,
        meta,
        span,
        parent: parentSpan,
        [GCP_LOG_SPAN_KEY]: span?.label,
        [GCP_LOG_TRACE_KEY]: parentSpan?.label,
      })
    }
  )

// https://github.com/googleapis/nodejs-logging/blob/main/src/entry.ts
export const GCP_LOG_TRACE_KEY = 'logging.googleapis.com/trace' as const
export const GCP_LOG_SPAN_KEY = 'logging.googleapis.com/spanId' as const

export const withTrace =
  (args: { trace: string; span: string }) =>
  <R, E, A>(effect: Effect.Effect<R, E, A>) =>
    pipe(
      effect,
      Effect.withLogSpan(args.span),
      Effect.annotateLogs(GCP_LOG_TRACE_KEY, args.trace),
      Effect.annotateLogs(GCP_LOG_SPAN_KEY, args.span)
    )
