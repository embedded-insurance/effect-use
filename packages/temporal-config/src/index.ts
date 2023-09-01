import * as Context from '@effect/data/Context'
import * as S from '@effect/schema/Schema'
import { pipe } from '@effect/data/Function'
import * as Layer from '@effect/io/Layer'

const TemporalConfigRequired = S.struct({
  address: S.string,
  namespace: S.string,
})

const TemporalConfigOptional = S.partial(
  S.struct({
    clientCert: S.string,
    clientKey: S.string,
  })
)

export const TemporalConfig = pipe(
  S.extend(TemporalConfigRequired, TemporalConfigOptional),
  S.description('Data required to establish a connection to Temporal.')
)
export type TemporalConfig = S.To<typeof TemporalConfig>

export const TemporalConfigTag = Context.Tag<TemporalConfig>(
  '@effect-use/TemporalConfig'
)

const TemporalEnvRequired = S.struct({
  TEMPORAL_ADDRESS: S.string,
  TEMPORAL_NAMESPACE: S.string,
})

const TemporalEnvOptional = S.partial(
  S.struct({
    TEMPORAL_CLIENT_CERT: S.string,
    TEMPORAL_CLIENT_KEY: S.string,
  })
)

export const TemporalEnv = S.extend(TemporalEnvRequired, TemporalEnvOptional)
export type TemporalEnv = S.To<typeof TemporalEnv>

/**
 * Data required to establish a connection to Temporal.
 * @param env
 * @category natural transformation
 */
export const configFromEnv = (env: TemporalEnv): TemporalConfig => ({
  address: env.TEMPORAL_ADDRESS,
  namespace: env.TEMPORAL_NAMESPACE,
  clientCert: env.TEMPORAL_CLIENT_CERT,
  clientKey: env.TEMPORAL_CLIENT_KEY,
})

export const makeTemporalConfigLayer = (
  config: TemporalConfig
): Layer.Layer<never, never, TemporalConfig> =>
  Layer.succeed(TemporalConfigTag, config)
