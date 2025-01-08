import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import { isRecord } from 'effect/Predicate'
import { TaggedError } from 'effect/Data'

export type Config = {
  /**
   * Base URL for all requests
   */
  baseURL?: string
  /**
   * Default headers to be sent with every request
   */
  headers?: Record<'Content-Type' | 'Authorization' | string, string>
}

export class FetchError extends TaggedError('FetchError')<{
  readonly input: {
    readonly baseURL?: string
    readonly path?: string
    readonly method?: string
  }
  readonly stack?: string
  readonly message: unknown
}> {}

export class InvalidURL extends TaggedError('InvalidURL')<{
  readonly input: string
  readonly stack?: string
  readonly message: unknown
}> {}

export class ErrorResponse extends TaggedError('ErrorResponse')<{
  readonly statusCode: number
  readonly response: Response
  readonly message: unknown
}> {}

export type Method = (
  args: RequestInit & {
    path?: string
    headers?: Record<string, string>
  }
) => Effect.Effect<Response, ErrorResponse | FetchError | InvalidURL>

export type Client = {
  baseUrl: string
  headers: Record<string, string>
  get: Method
  post: Method
  put: Method
  delete: Method
  patch: Method
  head: Method
}

export type Fetch = (input: string, init: RequestInit) => Promise<Response>
export const Fetch = Context.GenericTag<Fetch>('fetch')

export const makeURL = (input: string): Effect.Effect<URL, InvalidURL> =>
  pipe(
    Effect.try(() => new URL(input)),
    Effect.mapError(
      (e) =>
        new InvalidURL({
          input: input,
          stack: (e as Error).stack,
          message: (e as Error).message,
        })
    )
  )

/**
 * Creates an HTTP client
 *
 * @example
 * import { Effect, pipe } from 'effect'
 * import * as HTTP from '@effect-use/http'
 *
 * pipe(
 *   HTTP.make({
 *     baseURL: 'https://google.com',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'Authorization': 'Bearer 1234'
 *     },
 *   }),
 *   Effect.map((http) => http.get({ path: '/hello' })),
 *   Effect.provideService(HTTP.Fetch, fetch),
 *   Effect.runPromise
 * )
 * @param args
 */
export const make = (args: Config): Effect.Effect<Client, never, Fetch> =>
  Effect.map(Fetch, (fetch) => {
    const f = (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'
    ) => {
      const fn: Method = (req) =>
        pipe(
          makeURL(`${args.baseURL || ''}${req.path || ''}`),
          Effect.tap((url) => Effect.logDebug(`${method} ${url.toString()}`)),
          Effect.flatMap((url) =>
            Effect.tryPromise({
              try: (signal) => {
                return fetch(url.toString(), {
                  ...req,
                  method,
                  signal: req.signal || signal,
                  headers: {
                    ...args.headers,
                    ...req.headers,
                  },
                })
              },
              catch: (e) => e,
            })
          ),
          Effect.mapError((e) => {
            if (isRecord(e) && e._tag === 'InvalidURL') {
              return e as unknown as InvalidURL
            }
            return new FetchError({
              input: {
                baseURL: args.baseURL,
                path: req.path,
                method,
              },
              stack: (e as Error).stack,
              message: (e as Error).message,
            })
          }),
          Effect.flatMap((response) =>
            response.status >= 400
              ? Effect.fail(
                  new ErrorResponse({
                    response: response,
                    statusCode: response.status,
                    message: response.statusText,
                  })
                )
              : Effect.succeed(response)
          ),
          Effect.tapErrorCause(Effect.logError),
          Effect.withLogSpan('@effect-use/http-client')
        )
      Object.defineProperty(fn, 'name', { value: method })
      return fn
    }

    return {
      baseUrl: args.baseURL || '',
      headers: args.headers || {},
      get: f('GET'),
      post: f('POST'),
      put: f('PUT'),
      delete: f('DELETE'),
      patch: f('PATCH'),
      head: f('HEAD'),
    }
  })
