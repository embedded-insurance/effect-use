import * as S from '@effect/schema/Schema'
import { Money, PaymentType } from './common'

/**
 * OriginatingAccount
 */
export const OriginatingAccount = S.struct({
  type: S.literal('BREX_CASH'),
  id: S.string,
})
export type OriginatingAccount = S.Schema.To<typeof OriginatingAccount>

/**
 * Recipient
 */
export const Recipient = S.struct({
  type: S.literal('ACCOUNT_ID', 'PAYMENT_INSTRUMENT_ID'),
  id: S.string,
})
export type Recipient = S.Schema.To<typeof Recipient>

/**
 * Counterparty
 */
export const CounterpartyType = S.literal('VENDOR', 'BOOK_TRANSFER')
export type CounterpartyType = S.Schema.To<typeof CounterpartyType>

export const Counterparty = S.struct({
  type: CounterpartyType,
  recipient: Recipient,
})
export type Counterparty = S.Schema.To<typeof Counterparty>

/**
 * TransferStatus
 */
export const TransferStatus = S.literal(
  'SCHEDULED', // The transaction is scheduled to enter the PROCESSING status.
  'PROCESSING', // Brex has started to process the sending or receiving of this transaction.
  'PENDING_APPROVAL', // The transaction requires approval before it can enter the SCHEDULED or PROCESSING status.
  'PROCESSED', // The money movement has been fully completed, which could mean money sent has arrived.
  'FAILED' // A grouping of multiple terminal states that prevented the transaction from completing. This includes
  // a user-cancellation, approval being denied, insufficient funds, failed verifications, etc.
)
export type TransferStatus = S.Schema.To<typeof TransferStatus>

/**
 * CancellationReason
 */
export const CancellationReason = S.literal(
  'USER_CANCELLED', // The transfer was canceled.
  'INSUFFICIENT_FUNDS', // The transfer could not be sent due to insufficient funds.
  'APPROVAL_DENIED', // The transfer was not sent because it was denied.
  'BLOCKED_BY_POSITIVE_PAY' // The transfer was blocked because of the ACH debit settings.
)
export type CancellationReason = S.Schema.To<typeof CancellationReason>

/**
 * Transfer
 */
const TransferRequired = S.struct({
  id: S.string,
  payment_type: PaymentType,
  amount: Money,
  originating_account: OriginatingAccount,
  status: TransferStatus,
})
// TODO: they call all these "| null", should these all be wrapped in S.nullable?
const TransferOptional = S.partial(
  S.struct({
    counterparty: S.nullable(
      S.struct({
        type: CounterpartyType,
        payment_instrument_id: S.string,
        id: S.string,
        routing_number: S.nullable(S.string),
        account_number: S.nullable(S.string),
      })
    ),
    description: S.nullable(S.string),
    process_date: S.nullable(S.string),
    cancellation_reason: S.nullable(S.string),
    estimated_delivery_date: S.nullable(S.string),
    creator_user_id: S.nullable(S.string),
    created_at: S.nullable(S.string),
    display_name: S.nullable(S.string),
    external_memo: S.nullable(S.string),
  })
)
export const Transfer = S.extend(TransferRequired, TransferOptional)
export type Transfer = S.Schema.To<typeof Transfer>

/**
 * Create Transfer Payload and response
 */
export const BrexCreateTransferPayload = S.struct({
  counterparty: Counterparty,
  amount: Money,
  description: S.string, // internal use
  external_memo: S.string, // <payment_instrument.beneficiary_name> - <external_memo>
  originating_account: OriginatingAccount,
  approval_type: S.nullable(S.literal('MANUAL')), // MANUAL requires a cash admin to approve the transaction before disbursing funds
})
export type BrexCreateTransferPayload = S.Schema.To<
  typeof BrexCreateTransferPayload
>

export const CreateTransferResponse = Transfer
export type CreateTransferResponse = S.Schema.To<typeof CreateTransferResponse>

/**
 * Get Transfer response
 */
export const GetTransferResponse = Transfer
export type GetTransferResponse = S.Schema.To<typeof GetTransferResponse>

/**
 * List Transfers response
 */
const ListTransfersResponseRequired = S.struct({
  items: S.array(Transfer),
})
const ListTransfersResponseOptional = S.partial(
  S.struct({
    next_cursor: S.string,
  })
)
export const ListTransfersResponse = S.extend(
  ListTransfersResponseRequired,
  ListTransfersResponseOptional
)
export type ListTransfersResponse = S.Schema.To<typeof ListTransfersResponse>
