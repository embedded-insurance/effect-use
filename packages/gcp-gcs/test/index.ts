import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import { download, getPresignedUrl, makeGCSLayer, write } from '../src'
import fs from 'fs'
import { makeFakeGCSLayer } from '../src/testing'

describe('write', () => {
  it('writes a file to a bucket', async () => {
    let writer: unknown[] = []

    const program = Effect.provide(
      write('test-bucket', 'test-key', 'test-body'),
      makeFakeGCSLayer({ writer })
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
          return Effect.unit
        })
      )
    )
  })

  describe('when an error occurs', () => {
    it('returns a typed error', async () => {
      const program = Effect.provide(
        write('test-bucket', 'test-key', 'test-body'),
        makeFakeGCSLayer({ throws: true })
      )
      await Effect.runPromise(
        pipe(
          program,
          Effect.flatMap((r) => {
            expect(r).not.toBeDefined()
            return Effect.unit
          }),
          Effect.catchTag('GCSWriteError', (e) => {
            expect(e).toEqual({
              _tag: 'GCSWriteError',
              message: 'Error: save: test error',
              stack: expect.any(String),
            })
            return Effect.unit
          })
        )
      )
    })
  })

  describe.skip('e2e implementation', () => {
    it('calls to test that failures are handled', async () => {
      const result = await pipe(
        write('dd-adfei-tech-dev-asdf-afda', 'test-key', 'test-body'),
        Effect.either,
        Effect.provide(makeGCSLayer()),
        Effect.runPromise
      )

      expect(Either.isLeft(result)).toBe(true)
    })
  })
})

describe('presigned URL', () => {
  it('returns a presigned URL for a file in a bucket', async () => {
    const program = Effect.provide(
      getPresignedUrl('a-bucket-name', 'file.txt', 1000),
      makeFakeGCSLayer({})
    )
    const url = await Effect.runPromise(program)
    expect(url[0]).toContain('https://gcp.com/a-bucket-name/file.txt/v4/read/')
  })

  describe('when an error occurs', () => {
    it('returns a typed error', async () => {
      const program = Effect.provide(
        getPresignedUrl('a-bucket-name', 'file.txt', 100),
        makeFakeGCSLayer({ throws: true })
      )
      await Effect.runPromise(
        pipe(
          program,
          Effect.flatMap((r) => {
            expect(r).not.toBeDefined()
            return Effect.unit
          }),
          Effect.catchTag('GCSUrlSigningError', (e) => {
            expect(e).toEqual({
              _tag: 'GCSUrlSigningError',
              message: 'Error: getSignedUrl: test error',
              stack: expect.any(String),
            })
            return Effect.unit
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
      makeFakeGCSLayer({ output })
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
        makeFakeGCSLayer({ throws: true })
      )
      await Effect.runPromise(
        pipe(
          program,
          Effect.flatMap((r) => {
            expect(r).not.toBeDefined()
            return Effect.unit
          }),
          Effect.catchTag('GCSDownloadError', (e) => {
            expect(e).toEqual({
              _tag: 'GCSDownloadError',
              message: 'Error: createReadStream: test error',
              stack: expect.any(String),
            })
            return Effect.unit
          })
        )
      )
    })
  })
})
