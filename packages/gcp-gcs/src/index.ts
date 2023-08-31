import { Storage, StorageOptions } from '@google-cloud/storage'
import * as Effect from '@effect/io/Effect'
import * as Layer from '@effect/io/Layer'
import * as Context from '@effect/data/Context'

export type GCS = Storage
/**
 * Tag for the GCS client
 */
export const GCS = Context.Tag<GCS>('@google-cloud/storage')

type GCSWriteError = {
  _tag: 'GCSWriteError'
  meassage: string
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
): Effect.Effect<GCS, unknown, void> =>
  Effect.flatMap(GCS, (gcs) =>
    Effect.tryPromise({
      try: () => gcs.bucket(bucket).file(key).save(data),
      catch: (e) => ({
        _tag: 'GCSWriteError',
        message: `${e}`,
        error: (e as Error).stack,
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
