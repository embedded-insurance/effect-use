import * as HTTP from '../src'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Cause from 'effect/Cause'

it('returns OK when response is 200', async () => {
  const { ok } = await pipe(
    Effect.Do,
    Effect.bind('http', () =>
      HTTP.make({
        baseURL: 'https://httpbin.org',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer 1234',
        },
      })
    ),
    Effect.bind('ok', ({ http }) =>
      Effect.all(
        {
          get: pipe(
            http.get({ path: '/get' }),
            Effect.map((a) => a.ok)
          ),
          post: pipe(
            http.post({ path: '/post' }),
            Effect.map((a) => a.ok)
          ),
          put: pipe(
            http.put({ path: '/put' }),
            Effect.map((a) => a.ok)
          ),
          delete: pipe(
            http.delete({ path: '/delete' }),
            Effect.map((a) => a.ok)
          ),
        },
        { concurrency: 'unbounded' }
      )
    ),
    Effect.provideService(HTTP.Fetch, fetch),
    Effect.tapError((e) => Effect.logError(Cause.fail(e))),
    Effect.runPromise
  )

  expect(ok.get).toEqual(true)
  expect(ok.post).toEqual(true)
  expect(ok.put).toEqual(true)
  expect(ok.delete).toEqual(true)
})

it('returns the error message returned by the server with the status code', async () => {
  const failure = await pipe(
    Effect.Do,
    Effect.bind('http', () =>
      HTTP.make({
        baseURL: 'https://httpbin.org/',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer 1234',
        },
      })
    ),
    Effect.flatMap(({ http }) => http.get({ path: '/status/404/random' })),
    Effect.provideService(HTTP.Fetch, fetch),
    Effect.runPromiseExit
  )
  // @ts-expect-error
  const cause = failure.cause
  expect(cause._tag).toEqual('Fail')

  const error = cause.error as HTTP.ErrorResponse

  expect(error.statusCode).toEqual(404)
  expect(error.message).toEqual('NOT FOUND')
  expect(error.response).toBeInstanceOf(Response)
})

it('returns a FetchError response in case of network error', async () => {
  const baseURL = 'https://httpbin.org'
  const path = '/status/400'
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer 1234',
  }
  const failure = await pipe(
    Effect.Do,
    Effect.bind('http', () =>
      HTTP.make({
        baseURL,
        headers,
      })
    ),
    Effect.bind('failure', ({ http }) => http.get({ path })),
    Effect.provideService(HTTP.Fetch, () =>
      Promise.reject(new TypeError('Network error'))
    ),
    Effect.runPromiseExit
  )

  // @ts-expect-error
  const cause = failure.cause
  expect(cause._tag).toEqual('Fail')
  expect(cause.error).toBeInstanceOf(HTTP.FetchError)
  expect(cause.error.input.baseURL).toEqual(baseURL)
  expect(cause.error.input.path).toEqual(path)
  expect(cause.error.input.method).toEqual('GET')
  expect(cause.error.message).toEqual('Network error')
  expect(cause.error.stack).toBeDefined()
})
