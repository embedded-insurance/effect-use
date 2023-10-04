import * as HTTP from '../src'
import * as Effect from '@effect/io/Effect'
import { pipe } from '@effect/data/Function'
import * as Cause from '@effect/io/Cause'

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
  const { notOk } = await pipe(
    Effect.Do,
    Effect.bind('http', () =>
      HTTP.make({
        baseURL: 'https://httpbin.org/status/400',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer 1234',
        },
      })
    ),
    Effect.bind('notOk', ({ http }) =>
      Effect.all(
        {
          get: http.get({ path: '/get' }),
          post: pipe(
            http.post({ path: '/post' }),

          ),
          put: pipe(
            http.put({ path: '/put' }),

          ),
          delete: pipe(
            http.delete({ path: '/delete' }),
          ),
        },
        { concurrency: 'unbounded' }
      )
    ),
    Effect.provideService(HTTP.Fetch, fetch),
    Effect.runPromise
  )

  const checkResponse = async (response: Response) => {
    expect(response.ok).toEqual(false)
    expect(response.status).toEqual(404)
    expect(response.statusText).toEqual('NOT FOUND')
  }

  checkResponse(notOk.get)
  checkResponse(notOk.post)
  checkResponse(notOk.put)
  checkResponse(notOk.delete)

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
        headers ,
      })
    ),
    Effect.bind('failure', ({ http }) =>
      Effect.all(
        {
          get: pipe(
            http.get({ path }),
            Effect.map((a) => a.ok)
          ),
        }
      )
    ),
    Effect.provideService(HTTP.Fetch, ()=> Promise.reject(new TypeError('Network error'))),
    Effect.runPromiseExit
  )
  // @ts-expect-error
  expect(failure.cause.error).toEqual({
    _tag: '@effect-use/http-client/FetchError',
    input:{
      baseURL,
      path,
      method: 'GET',
      headers,
      body: undefined,
    },
    message: 'Network error',
    stack: expect.any(String),
  })
})

