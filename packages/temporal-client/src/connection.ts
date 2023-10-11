import { Connection } from '@temporalio/client'
import { Effect, Context, Scope, Layer, pipe } from 'effect'
import { TemporalConfig, TemporalConfigTag } from '@effect-use/temporal-config'

export type TemporalConnection = Connection
export const TemporalConnection = Context.Tag<TemporalConnection>(
  '@effect-use.temporal-client/Connection'
)

const optionalConnectionConfig = (config: TemporalConfig) =>
  config.clientKey && config.clientCert
    ? {
        tls: {
          clientCertPair: {
            crt: Buffer.from(config.clientCert),
            key: Buffer.from(config.clientKey),
          },
        },
      }
    : undefined

export const acquireConnection: Effect.Effect<
  TemporalConfig,
  unknown,
  Connection
> = Effect.flatMap(TemporalConfigTag, (config) =>
  pipe(
    Effect.logDebug('Acquiring Temporal connection...'),
    Effect.flatMap(() =>
      Effect.tryPromise(() =>
        Connection.connect({
          address: config.address,
          ...optionalConnectionConfig(config),
        })
      )
    ),
    Effect.tap(() => Effect.logDebug('Temporal connection acquired.'))
  )
)

export const connectionResource: Effect.Effect<
  Scope.Scope | TemporalConfig,
  unknown,
  Connection
> = Effect.acquireRelease(acquireConnection, (conn) =>
  pipe(
    Effect.logDebug('Closing Temporal connection...'),
    Effect.flatMap(() => Effect.promise(() => conn.close())),
    Effect.tap(() => Effect.logDebug('Temporal connection closed.'))
  )
)
/**
 * @category dependency layer
 */
export const ConnectionLive: Layer.Layer<
  TemporalConfig | Scope.Scope,
  unknown,
  Connection
> = Layer.effect(TemporalConnection, connectionResource)
