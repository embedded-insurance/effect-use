import * as HTTP from '@effect-use/http-client'
import * as Context from 'effect/Context'
import { flow, pipe } from 'effect/Function'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as S from 'effect/Schema'
import {
  BrexCreateTransferPayload,
  CreateTransferResponse,
  GetTransferResponse,
  GetVendorResponse,
  ListTransfersResponse,
  ListVendorsResponse,
} from './types'

export const BrexConfig = S.extend(
  S.Struct({ BREX_API_KEY: S.String }),
  S.partial(S.Struct({ BREX_BASE_URL: S.String }))
)
export type BrexConfig = S.Schema.Type<typeof BrexConfig>

const defaultBrexAPIURL = 'https://platform.brexapis.com'

const BrexHTTPClient = Context.GenericTag<HTTP.Client>('brex')

export type BrexClient = {
  Transfer: {
    createTransfer: (
      input: CreateTransferArgs
    ) => Effect.Effect<CreateTransferResponse, unknown>
    getTransfer: (id: string) => Effect.Effect<GetTransferResponse, unknown>
    listTransfers: (
      cursor?: string,
      limit?: number
    ) => Effect.Effect<ListTransfersResponse, unknown>
  }
  Vendor: {
    getVendor: (id: string) => Effect.Effect<GetVendorResponse, unknown>
    listVendors: () => Effect.Effect<ListVendorsResponse, unknown>
  }
}

export const Brex = Context.GenericTag<BrexClient>('brex')

export const makeBrexClientLayer = (
  config: BrexConfig
): Layer.Layer<BrexClient> =>
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
const CreateTransferArgs = S.Struct({
  input: BrexCreateTransferPayload,
  idempotencyKey: S.String,
})
type CreateTransferArgs = S.Schema.Type<typeof CreateTransferArgs>
const createTransfer = (
  args: CreateTransferArgs
): Effect.Effect<CreateTransferResponse, unknown, HTTP.Client> =>
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
    Effect.flatMap((response) =>
      Effect.tryPromise({ try: () => response.json(), catch: (e) => e })
    ),
    Effect.tapErrorCause((e) =>
      Effect.logError('Failed to create Brex transfer', e)
    )
  )

const getTransfer = (
  id: string
): Effect.Effect<GetTransferResponse, unknown, HTTP.Client> =>
  Effect.flatMap(BrexHTTPClient, (client) =>
    pipe(
      client.get({
        path: `/v1/transfers?id=${id}`,
      }),
      Effect.flatMap((response) =>
        Effect.tryPromise({ try: () => response.json(), catch: (e) => e })
      ),
      Effect.tapErrorCause((e) =>
        Effect.logError(`Failed to retrieve Brex transfer`, e)
      )
    )
  )

const listTransfers = (
  cursor?: string,
  limit?: number
): Effect.Effect<ListTransfersResponse, unknown, HTTP.Client> =>
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
        Effect.tryPromise({ try: () => response.json(), catch: (e) => e })
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
): Effect.Effect<GetVendorResponse, unknown, HTTP.Client> =>
  pipe(
    Effect.flatMap(BrexHTTPClient, (client) =>
      client.get({ path: `/v1/vendors?id=${id}` })
    ),
    Effect.flatMap((response) =>
      Effect.tryPromise({ try: () => response.json(), catch: (e) => e })
    ),
    Effect.tapErrorCause((e) =>
      Effect.logError(`Failed to retrieve Brex vendor`, e)
    )
  )

const listVendors = (): Effect.Effect<
  ListVendorsResponse,
  unknown,
  HTTP.Client
> =>
  pipe(
    BrexHTTPClient,
    Effect.tap(() => Effect.logDebug('Listing Brex vendors')),
    Effect.flatMap((client) => client.get({ path: `/v1/vendors` })),
    Effect.flatMap((response) =>
      Effect.tryPromise({ try: () => response.json(), catch: (e) => e })
    ),
    Effect.tapErrorCause((e) =>
      Effect.logError(`Failed to retrieve Brex vendors`, e)
    )
  )

const removeUndefined = (obj: Record<string, any>): Record<string, any> => {
  Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key])
  return obj
}
