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
) => Effect.Effect<never, ErrorResponse | FetchError | InvalidURL, Response>

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

export const makeURL = (input: string): Effect.Effect<never, InvalidURL, URL> =>
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
            Effect.tryPromise((signal) => {
              return fetch(url.toString(), {
                ...req,
                method,
                signal: req.signal || signal,
                headers: {
                  ...args.headers,
                  ...req.headers,
                },
              })
            })
          ),
          Effect.mapError((e) => {
            if (isRecord(e) && e._tag === 'InvalidURL') {
              // @ts-expect-error
              return e as InvalidURL
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
      path: f('PATCH'),
      head: f('HEAD'),
    }
  })
