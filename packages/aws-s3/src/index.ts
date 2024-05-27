import { S3 as S3Client, S3ClientConfig } from '@aws-sdk/client-s3'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Context from 'effect/Context'

/**
 * Tag for the S3 client
 */
export const S3 = Context.GenericTag<S3Client>('@aws-sdk/client-s3')

export type S3 = S3Client

/**
 * Create a layer for the S3 client
 * @param options
 */
export const makeS3Layer = (options: S3ClientConfig = {}) =>
  Layer.effect(
    S3,
    Effect.try(() => new S3Client(options))
  )
