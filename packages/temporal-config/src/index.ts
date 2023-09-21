import * as Context from '@effect/data/Context'
import * as S from '@effect/schema/Schema'

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
/**
 * Data required to establish a connection to Temporal.
 */
export const TemporalConfig = S.extend(
  TemporalConfigRequired,
  TemporalConfigOptional
)

/**
 * Data required to establish a connection to Temporal.
 */
export type TemporalConfig = S.Schema.To<typeof TemporalConfig>

/**
 * Data required to establish a connection to Temporal.
 */
export const TemporalConfigTag = Context.Tag<TemporalConfig>(
  '@effect-use.temporal-config/TemporalConfig'
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

// const TemporalEnvOptional = S.union(
//   S.struct({}),
//   S.struct({
//     TEMPORAL_CLIENT_CERT: S.string,
//     TEMPORAL_CLIENT_KEY: S.string,
//   })
// )

/**
 * Data required to establish a connection to Temporal.
 */
export const TemporalEnv = S.extend(TemporalEnvRequired, TemporalEnvOptional)

/**
 * Data required to establish a connection to Temporal.
 */
export type TemporalEnv = S.Schema.To<typeof TemporalEnv>

/**
 * Data required to establish a connection to Temporal.
 */
export const TemporalEnvTag = Context.Tag<TemporalEnv>(
  '@effect-use.temporal-config/TemporalEnv'
)

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
//
// /**
//  * Data required to establish a connection to Temporal.
//  * @param env
//  * @category natural transformation
//  */
// export const configFromEnv = (env: TemporalEnv): TemporalConfig => ({
//   address: env.TEMPORAL_ADDRESS,
//   namespace: env.TEMPORAL_NAMESPACE,
//   ...('TEMPORAL_CLIENT_CERT' in env
//     ? {
//       clientCert: env.TEMPORAL_CLIENT_CERT,
//       clientKey: env.TEMPORAL_CLIENT_KEY,
//     }
//     : undefined),
// })
