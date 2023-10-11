import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import * as Layer from 'effect/Layer'
import { pipe } from 'effect/Function'
import { GCS, makeGCSLayer, write } from '../src'

const gcsCollectWrites = (args: { writes: unknown[] }): Partial<GCS> => {
  return {
    // @ts-ignore
    bucket: (bucketName: string) => ({
      file: (key: string) => ({
        save: (body: string) => {
          args.writes.push({ bucketName, key, body })
          return Promise.resolve()
        },
      }),
    }),
  }
}

test('Fake GCS implementation', async () => {
  let writes: unknown[] = []
  await pipe(
    write('test-bucket', 'test-key', 'test-body'),
    Effect.provide(
      Layer.succeed(GCS, gcsCollectWrites({ writes }) as unknown as GCS)
    ),
    Effect.runPromise
  ).then(() => {
    expect(writes).toEqual([
      {
        bucketName: 'test-bucket',
        key: 'test-key',
        body: 'test-body',
      },
    ])
  })
})

test('real call to test that failures are handled', async () => {
  const result = await pipe(
    write('dd-adfei-tech-dev-asdf-afda', 'test-key', 'test-body'),
    Effect.either,
    Effect.provide(makeGCSLayer()),
    Effect.runPromise
  )

  expect(Either.isLeft(result)).toBe(true)
})
