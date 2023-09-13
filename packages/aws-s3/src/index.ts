import * as Effect from '@effect/io/Effect'
import * as Layer from '@effect/io/Layer'
import * as Context from '@effect/data/Context'
import { S3 as S3Client, S3ClientConfig } from '@aws-sdk/client-s3'

export type S3 = S3Client

export const S3 = Context.Tag<S3>('@effect-use/aws-s3')

/**
 * Create a layer for the S3 client
 * @param options
 */
export const makeS3Layer = (options: S3ClientConfig = {}) =>
  Layer.effect(
    S3,
    Effect.try(() => new S3Client(options))
  )
