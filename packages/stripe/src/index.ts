import * as Context from 'effect/Context'
import { flow } from 'effect/Function'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as StripeAPI from 'stripe'

// https://stripe.com/docs/reports/api
// https://stripe.com/docs/reports/report-types

const Stripe = Context.GenericTag<StripeAPI.Stripe>('stripe')

export type StripeClient = {
  BalanceTransactions: {
    getBalanceTransaction: (
      balanceTransactionId: string
    ) => Effect.Effect<
      StripeAPI.Stripe.Response<StripeAPI.Stripe.BalanceTransaction>,
      unknown
    >
    listBalanceTransactions: (
      args: StripeAPI.Stripe.BalanceTransactionListParams
    ) => Effect.Effect<
      {
        data: Array<StripeAPI.Stripe.BalanceTransaction>
        has_more: boolean
      },
      unknown
    >
  }
  Payouts: {
    getPayoutById: (
      payoutId: string
    ) => Effect.Effect<
      StripeAPI.Stripe.Response<StripeAPI.Stripe.Payout>,
      unknown
    >
    listPayouts: (
      args: StripeAPI.Stripe.PayoutListParams
    ) => Effect.Effect<
      StripeAPI.Stripe.Response<
        StripeAPI.Stripe.ApiList<StripeAPI.Stripe.Payout>
      >,
      unknown
    >
    getPayoutReconciliationReport: () => Effect.Effect<
      StripeAPI.Stripe.Response<StripeAPI.Stripe.Reporting.ReportType>,
      unknown
    >
  }
  Invoices: {
    getInvoice: (
      invoiceId: string
    ) => Effect.Effect<
      StripeAPI.Stripe.Response<StripeAPI.Stripe.Invoice>,
      unknown
    >
  }
}

export const StripeClient = Context.GenericTag<StripeClient>('stripe-client')

export const makeStripeClientLayer = (
  stripeAPIKey: string
): Layer.Layer<StripeClient> =>
  Layer.sync(StripeClient, () => {
    const stripeClient = new StripeAPI.Stripe(stripeAPIKey, {
      apiVersion: '2022-11-15',
      typescript: true,
    })
    return {
      Payouts: {
        getPayoutById: flow(
          getPayoutById,
          Effect.provideService(Stripe, stripeClient),
          Effect.withLogSpan('@effect-use/stripe.getPayoutById')
        ),
        listPayouts: flow(
          listPayouts,
          Effect.provideService(Stripe, stripeClient),
          Effect.withLogSpan('@effect-use/stripe.listPayouts')
        ),
        getPayoutReconciliationReport: flow(
          getItemizedPayoutReconciliationReport,
          Effect.provideService(Stripe, stripeClient),
          Effect.withLogSpan('@effect-use/stripe.getPayoutReconciliationReport')
        ),
      },
      BalanceTransactions: {
        getBalanceTransaction: flow(
          getBalanceTransaction,
          Effect.provideService(Stripe, stripeClient),
          Effect.withLogSpan('@effect-use/stripe.getBalanceTransaction')
        ),
        listBalanceTransactions: flow(
          listBalanceTransactions,
          Effect.provideService(Stripe, stripeClient),
          Effect.withLogSpan('@effect-use/stripe.listBalanceTransactions')
        ),
      },
      Invoices: {
        getInvoice: flow(
          getInvoice,
          Effect.provideService(Stripe, stripeClient),
          Effect.withLogSpan('@effect-use/stripe.getInvoice')
        ),
      },
    }
  })

/**
 * Balance Transactions
 *
 * https://stripe.com/docs/reports/balance
 * https://stripe.com/docs/reports/report-types#balance
 */
const getBalanceTransaction = (
  balanceTransactionId: string
): Effect.Effect<
  StripeAPI.Stripe.Response<StripeAPI.Stripe.BalanceTransaction>,
  unknown,
  StripeAPI.Stripe
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise({
      try: () => stripe.balanceTransactions.retrieve(balanceTransactionId),
      catch: (e) => e,
    })
  )

const listBalanceTransactions = (
  args: StripeAPI.Stripe.BalanceTransactionListParams
): Effect.Effect<
  {
    data: Array<StripeAPI.Stripe.BalanceTransaction>
    has_more: boolean
  },
  unknown,
  StripeAPI.Stripe
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise({
      try: () => stripe.balanceTransactions.list(args),
      catch: (e) => e,
    })
  )

/**
 * Payouts
 *
 * https://stripe.com/docs/reports/payout-reconciliation
 */
const getPayoutById = (
  payoutId: string
): Effect.Effect<
  StripeAPI.Stripe.Response<StripeAPI.Stripe.Payout>,
  unknown,
  StripeAPI.Stripe
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise({
      try: () => stripe.payouts.retrieve(payoutId),
      catch: (e) => e,
    })
  )

const listPayouts = (
  args: StripeAPI.Stripe.PayoutListParams
): Effect.Effect<
  StripeAPI.Stripe.Response<StripeAPI.Stripe.ApiList<StripeAPI.Stripe.Payout>>,
  unknown,
  StripeAPI.Stripe
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise({ try: () => stripe.payouts.list(args), catch: (e) => e })
  )

// https://stripe.com/docs/reports/report-types#payout-reconciliation
const getItemizedPayoutReconciliationReport = (
  reportTypeId: '1' | '2' | '3' | '4' | '5' = '5'
): Effect.Effect<
  StripeAPI.Stripe.Response<StripeAPI.Stripe.Reporting.ReportType>,
  unknown,
  StripeAPI.Stripe
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise({
      try: () =>
        stripe.reporting.reportTypes.retrieve(
          `payout_reconciliation.itemized.${reportTypeId}`
        ),
      catch: (e) => e,
    })
  )

/**
 * Invoices
 */
const getInvoice = (
  invoiceId: string
): Effect.Effect<
  StripeAPI.Stripe.Response<StripeAPI.Stripe.Invoice>,
  unknown,
  StripeAPI.Stripe
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise({
      try: () => stripe.invoices.retrieve(invoiceId),
      catch: (e) => e,
    })
  )
