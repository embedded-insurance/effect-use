import * as Context from 'effect/Context'
import { flow } from 'effect/Function'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as StripeAPI from 'stripe'

// https://stripe.com/docs/reports/api
// https://stripe.com/docs/reports/report-types

const Stripe = Context.Tag<StripeAPI.Stripe>('stripe')

export type StripeClient = {
  BalanceTransactions: {
    getBalanceTransaction: (
      balanceTransactionId: string
    ) => Effect.Effect<
      never,
      unknown,
      StripeAPI.Stripe.Response<StripeAPI.Stripe.BalanceTransaction>
    >
    listBalanceTransactions: (
      args: StripeAPI.Stripe.BalanceTransactionListParams
    ) => Effect.Effect<
      never,
      unknown,
      {
        data: Array<StripeAPI.Stripe.BalanceTransaction>
        has_more: boolean
      }
    >
  }
  Payouts: {
    getPayoutById: (
      payoutId: string
    ) => Effect.Effect<
      never,
      unknown,
      StripeAPI.Stripe.Response<StripeAPI.Stripe.Payout>
    >
    listPayouts: (
      args: StripeAPI.Stripe.PayoutListParams
    ) => Effect.Effect<
      never,
      unknown,
      StripeAPI.Stripe.Response<
        StripeAPI.Stripe.ApiList<StripeAPI.Stripe.Payout>
      >
    >
    getPayoutReconciliationReport: () => Effect.Effect<
      never,
      unknown,
      StripeAPI.Stripe.Response<StripeAPI.Stripe.Reporting.ReportType>
    >
  }
  Invoices: {
    getInvoice: (
      invoiceId: string
    ) => Effect.Effect<
      never,
      unknown,
      StripeAPI.Stripe.Response<StripeAPI.Stripe.Invoice>
    >
  }
}

export const StripeClient = Context.Tag<StripeClient>('stripe-client')

export const makeStripeClientLayer = (
  stripeAPIKey: string
): Layer.Layer<never, never, StripeClient> =>
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
  StripeAPI.Stripe,
  unknown,
  StripeAPI.Stripe.Response<StripeAPI.Stripe.BalanceTransaction>
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise(() =>
      stripe.balanceTransactions.retrieve(balanceTransactionId)
    )
  )

const listBalanceTransactions = (
  args: StripeAPI.Stripe.BalanceTransactionListParams
): Effect.Effect<
  StripeAPI.Stripe,
  unknown,
  {
    data: Array<StripeAPI.Stripe.BalanceTransaction>
    has_more: boolean
  }
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise(() => stripe.balanceTransactions.list(args))
  )

/**
 * Payouts
 *
 * https://stripe.com/docs/reports/payout-reconciliation
 */
const getPayoutById = (
  payoutId: string
): Effect.Effect<
  StripeAPI.Stripe,
  unknown,
  StripeAPI.Stripe.Response<StripeAPI.Stripe.Payout>
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise(() => stripe.payouts.retrieve(payoutId))
  )

const listPayouts = (
  args: StripeAPI.Stripe.PayoutListParams
): Effect.Effect<
  StripeAPI.Stripe,
  unknown,
  StripeAPI.Stripe.Response<StripeAPI.Stripe.ApiList<StripeAPI.Stripe.Payout>>
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise(() => stripe.payouts.list(args))
  )

// https://stripe.com/docs/reports/report-types#payout-reconciliation
const getItemizedPayoutReconciliationReport = (
  reportTypeId: '1' | '2' | '3' | '4' | '5' = '5'
): Effect.Effect<
  StripeAPI.Stripe,
  unknown,
  StripeAPI.Stripe.Response<StripeAPI.Stripe.Reporting.ReportType>
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise(() =>
      stripe.reporting.reportTypes.retrieve(
        `payout_reconciliation.itemized.${reportTypeId}`
      )
    )
  )

/**
 * Invoices
 */
const getInvoice = (
  invoiceId: string
): Effect.Effect<
  StripeAPI.Stripe,
  unknown,
  StripeAPI.Stripe.Response<StripeAPI.Stripe.Invoice>
> =>
  Effect.flatMap(Stripe, (stripe) =>
    Effect.tryPromise(() => stripe.invoices.retrieve(invoiceId))
  )
