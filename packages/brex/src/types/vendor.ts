import * as S from '@effect/schema/Schema'

/**
 * Payment Account Type
 */
export const PaymentAccountType = S.Literal(
  'ACH',
  'CHEQUE',
  'DOMESTIC_WIRE',
  'INTERNATIONAL_WIRE'
)
export type PaymentAccountType = S.Schema.Type<typeof PaymentAccountType>

/**
 * Address
 */
export const Address = S.partial(
  S.Struct({
    line1: S.NullOr(S.String),
    line2: S.NullOr(S.String),
    city: S.NullOr(S.String),
    state: S.NullOr(S.String),
    country: S.NullOr(S.String),
    postal_code: S.NullOr(S.String),
    phone_number: S.NullOr(S.String),
  })
)
export type Address = S.Schema.Type<typeof Address>

/**
 * Payment Account Details
 */
export const PaymentAccountDetails = S.Struct({
  type: PaymentAccountType,
  payment_instrument_id: S.String,
  routing_number: S.String,
  account_number: S.String,
  address: Address,
})
export type PaymentAccountDetails = S.Schema.Type<typeof PaymentAccountDetails>

/**
 * Vendor
 */
const VendorRequired = S.Struct({
  id: S.String,
})
const VendorOptional = S.partial(
  S.Struct({
    company_name: S.String,
    email: S.NullOr(S.String),
    phone: S.NullOr(S.String),
    payment_accounts: S.NullOr(S.Array(PaymentAccountDetails)),
  })
)
export const Vendor = S.extend(VendorRequired, VendorOptional)
export type Vendor = S.Schema.Type<typeof Vendor>

/**
 * Get Vendor Response
 */
export const GetVendorResponse = Vendor
export type GetVendorResponse = S.Schema.Type<typeof GetVendorResponse>

/**
 * List Vendors Response
 */
const ListVendorsResponseOptional = S.partial(
  S.Struct({
    next_cursor: S.String,
  })
)
const ListVendorsResponseRequired = S.Struct({
  items: S.Array(Vendor),
})
export const ListVendorsResponse = S.extend(
  ListVendorsResponseRequired,
  ListVendorsResponseOptional
)
export type ListVendorsResponse = S.Schema.Type<typeof ListVendorsResponse>
