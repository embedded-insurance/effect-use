import { pipe } from 'effect/Function'
import * as S from '@effect/schema/Schema'

/**
 * PaymentType
 */
export const PaymentType = S.literal(
  'ACH',
  'BOOK_TRANSFER',
  'CHEQUE',
  'DOMESTIC_WIRE',
  'INTERNATIONAL_WIRE'
)
export type PaymentType = S.Schema.To<typeof PaymentType>

/**
 * CurrencyAmount
 */
export const CurrencyAmount = pipe(
  S.number,
  S.int(),
  S.nonNegative(),
  S.description('Integer amount in lowest currency denomination')
)
export type CurrencyAmount = S.Schema.To<typeof CurrencyAmount>

/**
 * Money
 */
export const Money = S.struct({
  amount: CurrencyAmount,
  currency: S.nullable(S.literal('USD')), // ISO 4217 format. default: USD
})
export type Money = S.Schema.To<typeof Money>
