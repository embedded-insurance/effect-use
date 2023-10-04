import * as Context from '@effect/data/Context'
import * as Effect from '@effect/io/Effect'
import { pipe } from '@effect/data/Function'
import * as Data from '@effect/data/Data'
import { isError, isRecord } from '@effect/data/Predicate'

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

export type Method = (
  args: RequestInit & {
    path?: string
    headers?: Record<string, string>
  }
) => Effect.Effect<never, FetchError | InvalidURL, Response>

export type Client = {
  baseUrl: string
  headers: Record<string, string>
  get: Method
  post: Method
  put: Method
  delete: Method
}

export type Fetch = (input: string, init: RequestInit) => Promise<Response>
export const Fetch = Context.Tag<Fetch>('fetch')

export interface InvalidURL extends Data.Case {
  _tag: '@effect-use/http-client/InvalidURL'
  input: string
  error: unknown
}

export const InvalidURL = Data.tagged<InvalidURL>(
  '@effect-use/http-client/InvalidURL'
)

export interface FetchError extends Data.Case {
  _tag: '@effect-use/http-client/FetchError'
  input?: {
    baseURL?: string
    path?: string
    method?: string
    headers?: Record<string, string>
    body?: unknown
  }
  message: string
  stack?: string | unknown
}

export const FetchError = Data.tagged<FetchError>(
  '@effect-use/http-client/FetchError'
)

export const makeURL = (input: string): Effect.Effect<never, InvalidURL, URL> =>
  pipe(
    Effect.try(() => new URL(input)),
    Effect.mapError((e) => InvalidURL({ input: input, error: e }))
  )

/**
 * Creates an HTTP client
 *
 * @example
 * import * as HTTP from '@effect-use/http'
 * import * as Effect from '@effect/io/Effect'
 * import { pipe } from '@effect/data/Function'
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
export const make = (args: Config): Effect.Effect<Fetch, never, Client> =>
  Effect.map(Fetch, (fetch) => {
    const f = (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'
    ) => {
      const fn: Method = (req) =>
        pipe(
          makeURL(`${args.baseURL || ''}${req.path || ''}`),
          Effect.tap((url) => Effect.logDebug(`${method} ${url.toString()}`)),
          Effect.flatMap((url) =>
            Effect.tryPromise((signal) =>
              // fetch promise resolves even when response type are not 2xx
              // it only rejects when there is a network error
              fetch(url.toString(), {
                ...req,
                method,
                signal: req.signal || signal,
                headers: {
                  ...args.headers,
                  ...req.headers,
                },
              })
            )
          ),
          Effect.flatMap((response) => Effect.succeed(response)),
          Effect.mapError((e) => {
            if (isRecord(e) && e._tag === 'InvalidURL') {
              // @ts-expect-error
              return e as InvalidURL
            }
            let message = 'Unknown error'
            let stack
            if(isError(e)){
              message = e.message
              stack = e.stack
            }
            return FetchError({
              input: {
                baseURL: args.baseURL,
                path: req.path,
                method,
                headers: {
                  ...args.headers,
                  ...req.headers,
                },
                body: req.body,
              },
              message,
              stack,
            })
          }),
          Effect.tapErrorCause(Effect.logDebug),
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
      path: f('PATCH'),
      head: f('HEAD'),
    }
  })
