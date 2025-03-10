import { pipe } from 'effect/Function'
import * as Effect from 'effect/Effect'
import * as FiberRef from 'effect/FiberRef'
import * as FiberRefs from 'effect/FiberRefs'
import * as Logger from 'effect/Logger'
import * as Option from 'effect/Option'
import * as List from 'effect/List'
import * as HashMap from 'effect/HashMap'
import * as Cause from 'effect/Cause'
import * as LogLevel from 'effect/LogLevel'
import * as S from 'effect/Schema'
import * as Layer from 'effect/Layer'
import * as LogSpan from 'effect/LogSpan'

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

export const defaultLogFunction = (a: LogEntry) => {
  if (a.level === 'ERROR' || a.level === 'FATAL') {
    console.error(JSON.stringify(a))
  } else {
    console.log(JSON.stringify(a))
  }
}

export type LogEntry = {
  annotations: Record<string, string>
  timestamp: string
  level: LogLevel.LogLevel['label']
  message: unknown
  meta: Record<string, string>
  span?: LogSpan.LogSpan | undefined
  parent?: LogSpan.LogSpan | undefined
  exception?: string
  [GCP_LOG_SPAN_KEY]?: string | undefined
  [GCP_LOG_TRACE_KEY]?: string | undefined
}

export const customLogger = (
  logFn: (a: LogEntry) => void = defaultLogFunction
) =>
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

      let messageOrCause = message
      let exception: any = undefined

      if (cause && cause._tag != 'Interrupt') {
        messageOrCause = message ?? Cause.pretty(cause)
        // TODO: this code could go away when https://github.com/Effect-TS/effect/pull/1756 is merged
        switch (cause._tag) {
          case 'Fail':
            exception = Cause.pretty(cause)
            break
          case 'Die':
            exception = Option.getOrElse(Cause.dieOption(cause), () => ({
              stack: 'Exception came with no defect!',
            }))
            exception = exception.stack
            break
          case 'Parallel':
          case 'Sequential':
            exception = Cause.pretty(cause)
            break
        }
      }
      if (
        message &&
        Array.isArray(message) &&
        message.length === 1 &&
        typeof message[0] === 'string'
      ) {
        message = message[0]
      }

      // TODO: should we use logAnnotations for span & trace?
      logFn({
        annotations: {
          ...anno,
        },
        timestamp: date.toISOString(),
        level: logLevel.label,
        exception,
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
  <R, E, A>(effect: Effect.Effect<A, E, R>) =>
    pipe(
      effect,
      Effect.withLogSpan(args.span),
      Effect.annotateLogs(GCP_LOG_TRACE_KEY, args.trace),
      Effect.annotateLogs(GCP_LOG_SPAN_KEY, args.span)
    )

export const LogLevelSchema = S.Literal<
  [
    LogLevel.All['_tag'],
    LogLevel.Fatal['_tag'],
    LogLevel.Error['_tag'],
    LogLevel.Warning['_tag'],
    LogLevel.Info['_tag'],
    LogLevel.Debug['_tag'],
    LogLevel.Trace['_tag'],
    LogLevel.None['_tag']
  ]
>('All', 'Fatal', 'Error', 'Warning', 'Info', 'Debug', 'Trace', 'None')

export const LogLayer = (level: LogLevel.Literal) =>
  Layer.provideMerge(
    Logger.replace(Logger.defaultLogger, customLogger()),
    Logger.minimumLogLevel(LogLevel.fromLiteral(level))
  )
