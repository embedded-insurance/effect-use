import * as HTTP from '../src'
import * as Effect from '@effect/io/Effect'
import { pipe } from '@effect/data/Function'
import * as Cause from '@effect/io/Cause'

test.skip('basic', async () => {
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
