import * as S from '@effect/schema/Schema'

/**
 * Payment Account Type
 */
export const PaymentAccountType = S.literal(
  'ACH',
  'CHEQUE',
  'DOMESTIC_WIRE',
  'INTERNATIONAL_WIRE'
)
export type PaymentAccountType = S.Schema.To<typeof PaymentAccountType>

/**
 * Address
 */
export const Address = S.partial(
  S.struct({
    line1: S.nullable(S.string),
    line2: S.nullable(S.string),
    city: S.nullable(S.string),
    state: S.nullable(S.string),
    country: S.nullable(S.string),
    postal_code: S.nullable(S.string),
    phone_number: S.nullable(S.string),
  })
)
export type Address = S.Schema.To<typeof Address>

/**
 * Payment Account Details
 */
export const PaymentAccountDetails = S.struct({
  type: PaymentAccountType,
  payment_instrument_id: S.string,
  routing_number: S.string,
  account_number: S.string,
  address: Address,
})
export type PaymentAccountDetails = S.Schema.To<typeof PaymentAccountDetails>

/**
 * Vendor
 */
const VendorRequired = S.struct({
  id: S.string,
})
const VendorOptional = S.partial(
  S.struct({
    company_name: S.string,
    email: S.nullable(S.string),
    phone: S.nullable(S.string),
    payment_accounts: S.nullable(S.array(PaymentAccountDetails)),
  })
)
export const Vendor = S.extend(VendorRequired, VendorOptional)
export type Vendor = S.Schema.To<typeof Vendor>

/**
 * Get Vendor Response
 */
export const GetVendorResponse = Vendor
export type GetVendorResponse = S.Schema.To<typeof GetVendorResponse>

/**
 * List Vendors Response
 */
const ListVendorsResponseOptional = S.partial(
  S.struct({
    next_cursor: S.string,
  })
)
const ListVendorsResponseRequired = S.struct({
  items: S.array(Vendor),
})
export const ListVendorsResponse = S.extend(
  ListVendorsResponseRequired,
  ListVendorsResponseOptional
)
export type ListVendorsResponse = S.Schema.To<typeof ListVendorsResponse>
