import { Context } from 'effect'
import * as S from 'effect/Schema'

const TemporalConfigRequired = S.Struct({
  address: S.String,
  namespace: S.String,
})
const TemporalConfigOptional = S.partial(
  S.Struct({
    clientCert: S.String,
    clientKey: S.String,
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
export type TemporalConfig = S.Schema.Type<typeof TemporalConfig>

/**
 * Data required to establish a connection to Temporal.
 */
export const TemporalConfigTag = Context.GenericTag<TemporalConfig>(
  '@effect-use.temporal-config/TemporalConfig'
)

const TemporalEnvRequired = S.Struct({
  TEMPORAL_ADDRESS: S.String,
  TEMPORAL_NAMESPACE: S.String,
})
const TemporalEnvOptional = S.partial(
  S.Struct({
    TEMPORAL_CLIENT_CERT: S.String,
    TEMPORAL_CLIENT_KEY: S.String,
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
export type TemporalEnv = S.Schema.Type<typeof TemporalEnv>

/**
 * Data required to establish a connection to Temporal.
 */
export const TemporalEnvTag = Context.GenericTag<TemporalEnv>(
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
