import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { pipe } from 'effect/Function'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { S3 } from '../src'

const s3CollectWrites = (args: { writes: unknown[] }): Partial<S3> => {
  return {
    send: async (sent: PutObjectCommand) => {
      args.writes.push(sent)
    },
  }
}

test('Fake S3 implementation', () => {
  let writes: unknown[] = []
  pipe(
    Effect.flatMap(S3, (s3) =>
      Effect.promise(() =>
        s3.send(
          new PutObjectCommand({
            Bucket: 'test-bucket',
            Key: 'test-key',
            Body: 'test-body',
          })
        )
      )
    ),
    Effect.provide(
      Layer.succeed(S3, s3CollectWrites({ writes }) as unknown as S3)
    ),
    Effect.runPromise
  ).then(() => {
    expect(
      writes.map(
        (x) =>
          // @ts-expect-error
          x.input
      )
    ).toEqual([
      {
        Bucket: 'test-bucket',
        Key: 'test-key',
        Body: 'test-body',
      },
    ])
  })
})
