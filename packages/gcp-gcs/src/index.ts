import { GetSignedUrlResponse, Storage } from '@google-cloud/storage'
import * as Effect from 'effect/Effect'
import * as Context from 'effect/Context'
import fs from 'fs'
import * as NodeStreamP from 'stream/promises'

export * from './layers'
export type GCS = Storage
export const GCS = Context.GenericTag<GCS>('@google-cloud/storage')

export type GCSWriteError = {
  _tag: 'GCSWriteError'
  message: string
  stack: unknown
}

export type GCSDownloadError = {
  _tag: 'GCSDownloadError'
  message: string
  stack: unknown
}

export type GCSUrlSigningError = {
  _tag: 'GCSUrlSigningError'
  message: string
  stack: unknown
}

type Errors = GCSWriteError | GCSDownloadError | GCSUrlSigningError
type GenericMessage = {
  message: string
}
const createError = <T extends Errors>(
  e: Error | GenericMessage,
  type: T['_tag']
): T => {
  if (e instanceof Error) {
    return {
      _tag: type,
      message: e.message,
      stack: e.stack,
    } as T
  }

  return {
    _tag: type,
    message: `${e.message}`,
    stack: 'No stack available',
  } as T
}

const isURLEncoded = (str: string) => {
  try {
    return decodeURI(str) === str
  } catch (e) {
    return false
  }
}

const ensureURLEncoded = (str: string) =>
  isURLEncoded(str) ? str : encodeURI(str)

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
): Effect.Effect<void, GCSWriteError, GCS> =>
  Effect.flatMap(GCS, (gcs) =>
    Effect.tryPromise({
      try: () => gcs.bucket(bucket).file(key).save(data),
      catch: (e) => createError<GCSWriteError>(e as any, 'GCSWriteError'),
    })
  )

/**
 * Download data from a bucket to tmp local file
 * @param bucket - bucket name
 * @param key - key of the file to download
 * @param options - urlEncodeKey: boolean
 */
export const download = (
  bucket: string,
  key: string,
  options: { urlEncodeKey?: boolean } = { urlEncodeKey: true }
): Effect.Effect<string, GCSDownloadError, GCS> => {
  const tmp = require('tmp')
  const fileName: string = tmp.tmpNameSync()

  return Effect.flatMap(GCS, (gcs) =>
    Effect.as(
      Effect.tryPromise({
        try: (signal) => {
          const readStream = gcs
            .bucket(bucket)
            .file(options.urlEncodeKey ? ensureURLEncoded(key) : key)
            .createReadStream()

          return NodeStreamP.pipeline(
            readStream,
            fs.createWriteStream(fileName),
            { signal }
          )
        },
        catch: (e) =>
          createError<GCSDownloadError>(e as any, 'GCSDownloadError'),
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
 * @param options
 */
export const getPresignedUrl = (
  bucket: string,
  key: string,
  lifetime: number,
  options: { urlEncodeKey?: boolean } = { urlEncodeKey: true }
): Effect.Effect<GetSignedUrlResponse, GCSUrlSigningError, GCS> =>
  Effect.flatMap(GCS, (gcs) =>
    Effect.tryPromise({
      try: () =>
        gcs
          .bucket(bucket)
          .file(options.urlEncodeKey ? ensureURLEncoded(key) : key)
          .getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + lifetime,
          }),
      catch: (e) =>
        createError<GCSUrlSigningError>(e as any, 'GCSUrlSigningError'),
    })
  )
