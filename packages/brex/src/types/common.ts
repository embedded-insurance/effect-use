import { pipe } from 'effect/Function'
import * as S from '@effect/schema/Schema'

/**
 * PaymentType
 */
export const PaymentType = S.Literal(
  'ACH',
  'BOOK_TRANSFER',
  'CHEQUE',
  'DOMESTIC_WIRE',
  'INTERNATIONAL_WIRE'
)
export type PaymentType = S.Schema.Type<typeof PaymentType>

/**
 * CurrencyAmount
 */
export const CurrencyAmount = pipe(
  S.Number,
  S.int(),
  S.nonNegative(),
  S.description('Integer amount in lowest currency denomination')
)
export type CurrencyAmount = S.Schema.Type<typeof CurrencyAmount>

/**
 * Money
 */
export const Money = S.Struct({
  amount: CurrencyAmount,
  currency: S.NullOr(S.Literal('USD')), // ISO 4217 format. default: USD
})
export type Money = S.Schema.Type<typeof Money>
