import * as HTTP from '@effect-use/http-client'
import * as Context from '@effect/data/Context'
import { flow, pipe } from '@effect/data/Function'
import * as Effect from '@effect/io/Effect'
import * as Layer from '@effect/io/Layer'
import * as S from '@effect/schema/Schema'
import {
  BrexCreateTransferPayload,
  CreateTransferResponse,
  GetTransferResponse,
  GetVendorResponse,
  ListTransfersResponse,
  ListVendorsResponse,
} from './types'

export const BrexConfig = S.extend(
  S.struct({ BREX_API_KEY: S.string }),
  S.partial(S.struct({ BREX_BASE_URL: S.string }))
)
export type BrexConfig = S.Schema.To<typeof BrexConfig>

const defaultBrexAPIURL = 'https://platform.brexapis.com'

const BrexHTTPClient = Context.Tag<HTTP.Client>('brex')

export type BrexClient = {
  Transfer: {
    createTransfer: (
      input: CreateTransferArgs
    ) => Effect.Effect<never, unknown, CreateTransferResponse>
    getTransfer: (
      id: string
    ) => Effect.Effect<never, unknown, GetTransferResponse>
    listTransfers: (
      cursor?: string,
      limit?: number
    ) => Effect.Effect<never, unknown, ListTransfersResponse>
  }
  Vendor: {
    getVendor: (id: string) => Effect.Effect<never, unknown, GetVendorResponse>
    listVendors: () => Effect.Effect<never, unknown, ListVendorsResponse>
  }
}

export const Brex = Context.Tag<BrexClient>('brex')

export const makeBrexClientLayer = (
  config: BrexConfig
): Layer.Layer<never, never, BrexClient> =>
  Layer.sync(Brex, () => {
    const http = pipe(
      HTTP.make({
        baseURL: config.BREX_BASE_URL || defaultBrexAPIURL,
        headers: {
          Authorization: `Bearer ${config.BREX_API_KEY}`,
        },
      }),
      Effect.provideService(HTTP.Fetch, fetch),
      Effect.runSync
    )
    return {
      Transfer: {
        createTransfer: flow(
          createTransfer,
          Effect.provideService(BrexHTTPClient, http),
          Effect.withLogSpan('@effect-use/brex-client.createTransfer')
        ),
        getTransfer: flow(
          getTransfer,
          Effect.provideService(BrexHTTPClient, http),
          Effect.withLogSpan('@effect-use/brex-client.getTransfer')
        ),
        listTransfers: flow(
          listTransfers,
          Effect.provideService(BrexHTTPClient, http),
          Effect.withLogSpan('@effect-use/brex-client.listTransfers')
        ),
      },
      Vendor: {
        getVendor: flow(
          getVendor,
          Effect.provideService(BrexHTTPClient, http),
          Effect.withLogSpan('@effect-use/brex-client.getVendor')
        ),
        listVendors: flow(
          listVendors,
          Effect.provideService(BrexHTTPClient, http),
          Effect.withLogSpan('@effect-use/brex-client.listVendors')
        ),
      },
    }
  })

/**
 * Transfers
 *
 * https://developer.brex.com/openapi/payments_api/#tag/Transfers
 *
 */
const CreateTransferArgs = S.struct({
  input: BrexCreateTransferPayload,
  idempotencyKey: S.string,
})
type CreateTransferArgs = S.Schema.To<typeof CreateTransferArgs>
const createTransfer = (
  args: CreateTransferArgs
): Effect.Effect<HTTP.Client, unknown, CreateTransferResponse> =>
  pipe(
    Effect.flatMap(BrexHTTPClient, (client) =>
      pipe(
        Effect.logDebug('Creating Brex transfer'),
        Effect.flatMap(() =>
          client.post({
            path: '/v1/transfers',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': args.idempotencyKey,
            },
            body: JSON.stringify(args.input),
          })
        )
      )
    ),
    Effect.flatMap((response) => Effect.tryPromise(() => response.json())),
    Effect.tapErrorCause((e) =>
      Effect.logError('Failed to create Brex transfer', e)
    )
  )

const getTransfer = (
  id: string
): Effect.Effect<HTTP.Client, unknown, GetTransferResponse> =>
  Effect.flatMap(BrexHTTPClient, (client) =>
    pipe(
      client.get({
        path: `/v1/transfers?id=${id}`,
      }),
      Effect.flatMap((response) => Effect.tryPromise(() => response.json())),
      Effect.tapErrorCause((e) =>
        Effect.logError(`Failed to retrieve Brex transfer`, e)
      )
    )
  )

const listTransfers = (
  cursor?: string,
  limit?: number
): Effect.Effect<HTTP.Client, unknown, ListTransfersResponse> =>
  Effect.flatMap(BrexHTTPClient, (client) =>
    pipe(
      Effect.Do,
      Effect.let(
        'queryParams',
        () =>
          new URLSearchParams(
            removeUndefined({
              cursor,
              limit,
            })
          )
      ),
      Effect.let('path', ({ queryParams }) => '/v1/transfers?' + queryParams),
      Effect.bind('response', ({ path }) => client.get({ path })),
      Effect.flatMap(({ response }) =>
        Effect.tryPromise(() => response.json())
      ),
      Effect.tapErrorCause((e) =>
        Effect.logError(`Failed to list Brex transfers`, e)
      )
    )
  )

/**
 * Vendors
 *
 * https://developer.brex.com/openapi/payments_api/#tag/Vendors
 */
const getVendor = (
  id: string
): Effect.Effect<HTTP.Client, unknown, GetVendorResponse> =>
  pipe(
    Effect.flatMap(BrexHTTPClient, (client) =>
      client.get({ path: `/v1/vendors?id=${id}` })
    ),
    Effect.flatMap((response) => Effect.tryPromise(() => response.json())),
    Effect.tapErrorCause((e) =>
      Effect.logError(`Failed to retrieve Brex vendor`, e)
    )
  )

const listVendors = (): Effect.Effect<
  HTTP.Client,
  unknown,
  ListVendorsResponse
> =>
  pipe(
    BrexHTTPClient,
    Effect.tap(() => Effect.logDebug('Listing Brex vendors')),
    Effect.flatMap((client) => client.get({ path: `/v1/vendors` })),
    Effect.flatMap((response) => Effect.tryPromise(() => response.json())),
    Effect.tapErrorCause((e) =>
      Effect.logError(`Failed to retrieve Brex vendors`, e)
    )
  )

const removeUndefined = (obj: Record<string, any>): Record<string, any> => {
  Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key])
  return obj
}
