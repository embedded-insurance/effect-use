import * as S from 'effect/Schema'
import { Money, PaymentType } from './common'

/**
 * OriginatingAccount
 */
export const OriginatingAccount = S.Struct({
  type: S.Literal('BREX_CASH'),
  id: S.String,
})
export type OriginatingAccount = S.Schema.Type<typeof OriginatingAccount>

/**
 * Recipient
 */
export const Recipient = S.Struct({
  type: S.Literal('ACCOUNT_ID', 'PAYMENT_INSTRUMENT_ID'),
  id: S.String,
})
export type Recipient = S.Schema.Type<typeof Recipient>

/**
 * Counterparty
 */
export const CounterpartyType = S.Literal('VENDOR', 'BOOK_TRANSFER')
export type CounterpartyType = S.Schema.Type<typeof CounterpartyType>

export const Counterparty = S.Struct({
  type: CounterpartyType,
  recipient: Recipient,
})
export type Counterparty = S.Schema.Type<typeof Counterparty>

/**
 * TransferStatus
 */
export const TransferStatus = S.Literal(
  'SCHEDULED', // The transaction is scheduled to enter the PROCESSING status.
  'PROCESSING', // Brex has started to process the sending or receiving of this transaction.
  'PENDING_APPROVAL', // The transaction requires approval before it can enter the SCHEDULED or PROCESSING status.
  'PROCESSED', // The money movement has been fully completed, which could mean money sent has arrived.
  'FAILED' // A grouping of multiple terminal states that prevented the transaction from completing. This includes
  // a user-cancellation, approval being denied, insufficient funds, failed verifications, etc.
)
export type TransferStatus = S.Schema.Type<typeof TransferStatus>

/**
 * CancellationReason
 */
export const CancellationReason = S.Literal(
  'USER_CANCELLED', // The transfer was canceled.
  'INSUFFICIENT_FUNDS', // The transfer could not be sent due to insufficient funds.
  'APPROVAL_DENIED', // The transfer was not sent because it was denied.
  'BLOCKED_BY_POSITIVE_PAY' // The transfer was blocked because of the ACH debit settings.
)
export type CancellationReason = S.Schema.Type<typeof CancellationReason>

/**
 * Transfer
 */
const TransferRequired = S.Struct({
  id: S.String,
  payment_type: PaymentType,
  amount: Money,
  originating_account: OriginatingAccount,
  status: TransferStatus,
})
// TODO: they call all these "| null", should these all be wrapped in S.nullable?
const TransferOptional = S.partial(
  S.Struct({
    counterparty: S.NullOr(
      S.Struct({
        type: CounterpartyType,
        payment_instrument_id: S.String,
        id: S.String,
        routing_number: S.NullOr(S.String),
        account_number: S.NullOr(S.String),
      })
    ),
    description: S.NullOr(S.String),
    process_date: S.NullOr(S.String),
    cancellation_reason: S.NullOr(S.String),
    estimated_delivery_date: S.NullOr(S.String),
    creator_user_id: S.NullOr(S.String),
    created_at: S.NullOr(S.String),
    display_name: S.NullOr(S.String),
    external_memo: S.NullOr(S.String),
  })
)
export const Transfer = S.extend(TransferRequired, TransferOptional)
export type Transfer = S.Schema.Type<typeof Transfer>

/**
 * Create Transfer Payload and response
 */
export const BrexCreateTransferPayload = S.Struct({
  counterparty: Counterparty,
  amount: Money,
  description: S.String, // internal use
  external_memo: S.String, // <payment_instrument.beneficiary_name> - <external_memo>
  originating_account: OriginatingAccount,
  approval_type: S.NullOr(S.Literal('MANUAL')), // MANUAL requires a cash admin to approve the transaction before disbursing funds
})
export type BrexCreateTransferPayload = S.Schema.Type<
  typeof BrexCreateTransferPayload
>

export const CreateTransferResponse = Transfer
export type CreateTransferResponse = S.Schema.Type<
  typeof CreateTransferResponse
>

/**
 * Get Transfer response
 */
export const GetTransferResponse = Transfer
export type GetTransferResponse = S.Schema.Type<typeof GetTransferResponse>

/**
 * List Transfers response
 */
const ListTransfersResponseRequired = S.Struct({
  items: S.Array(Transfer),
})
const ListTransfersResponseOptional = S.partial(
  S.Struct({
    next_cursor: S.String,
  })
)
export const ListTransfersResponse = S.extend(
  ListTransfersResponseRequired,
  ListTransfersResponseOptional
)
export type ListTransfersResponse = S.Schema.Type<typeof ListTransfersResponse>
