import { Storage, StorageOptions } from '@google-cloud/storage'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Context from 'effect/Context'
import fs from 'fs'
import * as NodeStreamP from 'node:stream/promises'

export type GCS = Storage
export const GCS = Context.Tag<GCS>('@google-cloud/storage')

type GCSWriteError = {
  _tag: 'GCSWriteError'
  message: string
  stack: unknown
}

type GCSDownloadError = {
  _tag: 'GCSDownloadError'
  message: string
  stack: unknown
}

type GCSUrlSigningError = {
  _tag: 'GCSUrlSigningError'
  message: string
  stack: unknown
}

/**
 * Writes data to key in bucket
 * @param bucket
 * @param key
 * @param data
 */
export const write = (
  bucket: string,
  key: string,
  data: string | Buffer
): Effect.Effect<GCS, GCSWriteError, void> =>
  Effect.flatMap(GCS, (gcs) =>
    Effect.tryPromise({
      try: () => gcs.bucket(bucket).file(key).save(data),
      catch: (e) => ({
        _tag: 'GCSWriteError',
        message: `${e}`,
        stack: (e as Error).stack,
      }),
    })
  )

/**
 * Download data from a bucket to tmp local file
 * @param bucket
 * @param key
 */
export const download = (
  bucket: string,
  key: string
): Effect.Effect<GCS, GCSDownloadError, string> => {
  const tmp = require('tmp')
  const fileName: string = tmp.tmpNameSync()

  return Effect.flatMap(GCS, (gcs) =>
    Effect.as(
      Effect.tryPromise({
        try: (signal) => {
          const readStream = gcs.bucket(bucket).file(key).createReadStream()

          return NodeStreamP.pipeline(
            readStream,
            fs.createWriteStream(fileName),
            { signal }
          )
        },
        catch: (e) => ({
          _tag: 'GCSDownloadError',
          message: `${e}`,
          stack: (e as Error).stack,
        }),
      }),
      fileName
    )
  )
}

/**
 * Returns the presigned URL for a file in a bucket
 * @param bucket
 * @param key
 * @param lifetime as time to live in milliseconds (relative to when URL is created)
 */
export const getPresignedUrl = (
  bucket: string,
  key: string,
  lifetime: number
) =>
  Effect.flatMap(GCS, (gcs) =>
    Effect.tryPromise({
      try: () =>
        gcs
          .bucket(bucket)
          .file(key)
          .getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + lifetime,
          }),
      catch: (e) => ({
        _tag: 'GCSUrlSigningError',
        message: `${e}`,
        stack: (e as Error).stack,
      }),
    })
  )

/**
 * Create a layer for the GCS client
 * @param options
 */
export const makeGCSLayer = (
  options?: StorageOptions
): Layer.Layer<never, unknown, GCS> =>
  Layer.effect(
    GCS,
    Effect.try(() => new Storage(options))
  )
