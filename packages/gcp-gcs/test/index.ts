import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import { download, getPresignedUrl, write } from '../src'
import fs from 'fs'
import { makeGCSLiveLayer, makeGCSTestLayer } from '../src/layers'

describe('write', () => {
  it('writes a file to a bucket', async () => {
    let writer: unknown[] = []

    const program = Effect.provide(
      write('test-bucket', 'test-key', 'test-body'),
      makeGCSTestLayer({ writer })
    )
    await Effect.runPromise(
      pipe(
        program,
        Effect.flatMap(() => {
          expect(writer).toEqual([
            {
              bucketName: 'test-bucket',
              key: 'test-key',
              body: 'test-body',
            },
          ])
          return Effect.void;
        })
      )
    )
  })

  describe('when an error occurs', () => {
    it('returns a typed error', async () => {
      const program = Effect.provide(
        write('test-bucket', 'test-key', 'test-body'),
        makeGCSTestLayer({ throws: true })
      )
      await Effect.runPromise(
        pipe(
          program,
          Effect.flatMap((r) => {
            expect(r).not.toBeDefined()
            return Effect.void;
          }),
          Effect.catchTag('GCSWriteError', (e) => {
            expect(e).toEqual({
              _tag: 'GCSWriteError',
              message: 'save: test error',
              stack: expect.any(String),
            })
            return Effect.void;
          })
        )
      )
    })
  })

  describe('e2e implementation', () => {
    it.skip('calls to test that failures are handled', async () => {
      const result = await pipe(
        write('ei-tech-dev-broker-reportings', 'test-key2', 'test-body'),
        Effect.either,
        Effect.provide(makeGCSLiveLayer()),
        Effect.runPromise
      )
      console.log(result)
      expect(Either.isLeft(result)).toBe(true)

    }, 40000)
  })
})

describe('presigned URL', () => {
  it('returns a presigned URL for a file in a bucket', async () => {
    const program = Effect.provide(
      getPresignedUrl('a-bucket-name', 'file.txt', 1000),
      makeGCSTestLayer({})
    )
    const url = await Effect.runPromise(program)
    expect(url[0]).toContain('https://gcp.com/a-bucket-name/file.txt/v4/read/')
  })

  describe('when an error occurs', () => {
    it('returns a typed error', async () => {
      const program = Effect.provide(
        getPresignedUrl('a-bucket-name', 'file.txt', 100),
        makeGCSTestLayer({ throws: true })
      )
      await Effect.runPromise(
        pipe(
          program,
          Effect.flatMap((r) => {
            expect(r).not.toBeDefined()
            return Effect.void;
          }),
          Effect.catchTag('GCSUrlSigningError', (e) => {
            expect(e).toEqual({
              _tag: 'GCSUrlSigningError',
              message: 'getSignedUrl: test error',
              stack: expect.any(String),
            })
            return Effect.void;
          })
        )
      )
    })
  })
})

describe('download', () => {
  it('downloads a file from google cloud storage', async () => {
    const output = 'ciao!'
    const program = Effect.provide(
      download('a-bucket-name', 'file.txt'),
      makeGCSTestLayer({ output })
    )
    const filePath = await Effect.runPromise(program)
    fs.readFile(filePath, 'utf8', (err, data) => {
      expect(data).toEqual(output)
    })
  })

  describe('when an error occurs', () => {
    it('returns a typed error', async () => {
      const program = Effect.provide(
        download('a-bucket-name', 'file.txt'),
        makeGCSTestLayer({ throws: true })
      )
      await Effect.runPromise(
        pipe(
          program,
          Effect.flatMap((r) => {
            expect(r).not.toBeDefined()
            return Effect.void;
          }),
          Effect.catchTag('GCSDownloadError', (e) => {
            expect(e).toEqual({
              _tag: 'GCSDownloadError',
              message: 'createReadStream: test error',
              stack: expect.any(String),
            })
            return Effect.void;
          })
        )
      )
    })
  })
})
