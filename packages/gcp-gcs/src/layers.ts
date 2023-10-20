import { Storage, StorageOptions } from '@google-cloud/storage'
import { Readable } from 'stream'
import * as Layer from 'effect/Layer'
import { GCS } from './index'
import * as Effect from 'effect/Effect'

export const makeGCSTestLayer = ({
  output = 'ciao!',
  throws = false,
  writer = [],
}: {
  output?: string
  throws?: boolean
  writer?: unknown[]
}) =>
  Layer.succeed(GCS, {
    bucket: (bucketName: string) => ({
      file: (key: string) => ({
        getSignedUrl: ({
          version,
          action,
          expires,
        }: {
          version: string
          action: string
          expires: string
        }) => {
          if (throws) {
            throw new Error('getSignedUrl: test error')
          }
          return Promise.resolve([
            `https://gcp.com/${bucketName}/${key}/${version}/${action}/${expires}`,
          ])
        },
        save: (body: string) => {
          if (throws) {
            throw new Error('save: test error')
          }
          writer.push({ bucketName, key, body })
          return Promise.resolve()
        },
        createReadStream: () =>
          new Readable({
            read() {
              if (throws) {
                throw new Error('createReadStream: test error')
              }
              this.push(output)
              this.push(null)
            },
          }),
      }),
    }),
  } as Storage)


/**
 * Create a layer for the GCS client
 * @param options
 */
export const makeGCSLiveLayer = (
  options?: StorageOptions
): Layer.Layer<never, unknown, GCS> =>
  Layer.effect(
    GCS,
    Effect.try(() => new Storage(options))
  )
