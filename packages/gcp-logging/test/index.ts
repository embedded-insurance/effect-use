import { pipe } from 'effect/Function'
import * as Effect from 'effect/Effect'
import * as Logger from 'effect/Logger'
import * as Duration from 'effect/Duration'
import * as Clock from 'effect/Clock'
import { ClockTypeId } from 'effect/Clock'
import * as Layer from 'effect/Layer'
import { customLogger, withTrace, logInfo } from '../src'
import { Cause } from 'effect'

const testClock: Clock.Clock = {
  [Clock.ClockTypeId]: ClockTypeId,
  get currentTimeMillis(): Effect.Effect<number> {
    return Effect.succeed(0)
  },
  sleep(duration: Duration.Duration): Effect.Effect<void> {
    return Effect.void;
  },
  unsafeCurrentTimeMillis(): number {
    return 0
  },
  get currentTimeNanos(): Effect.Effect<bigint> {
    return Effect.succeed(0n)
  },
  unsafeCurrentTimeNanos(): bigint {
    return 0n
  },
}

const child = pipe(
  Effect.Do,
  Effect.tap(() => Effect.log('enter')),
  Effect.flatMap(() => Effect.succeed(42)),
  Effect.withLogSpan('child')
)
const parent = pipe(child, Effect.withLogSpan('parent'))

const makeTestLayer = (onLog: (x: any) => void) =>
  Layer.mergeAll(
    Layer.setClock(testClock),
    Logger.replace(
      Logger.defaultLogger,
      customLogger((a) => {
        onLog(a)
      })
    )
  )

describe('logError', () => {
  describe('when logging error with a message and a cause from a handled error', () => {
    it('reports the failure', () => {
      let log: unknown[] = []

      pipe(
        pipe(
          Effect.logError(
            'message in the log',
            Cause.fail('cause of the error')
          )
        ),

        Effect.provide(
          pipe(
            Layer.provideMerge(
              Layer.succeed(Clock.Clock, testClock),
              Logger.replace(
                Logger.defaultLogger,
                customLogger((a) => {
                  log.push(a)
                })
              )
            )
          )
        ),
        Effect.runSync
      )

      expect(log).toEqual([
        {
          annotations: {},
          level: 'ERROR',
          'logging.googleapis.com/spanId': undefined,
          'logging.googleapis.com/trace': undefined,
          message: 'message in the log',
          exception: 'Error: cause of the error',
          meta: {},
          parent: undefined,
          span: undefined,
          timestamp: expect.any(String),
        },
      ])
    })
  })

  describe('when logging error with a message and a cause from an unhandled error', () => {
    const functionThatThrowError = () => {
      throw Error('an error message')
    }

    it('reports the exception', () => {
      let log: unknown[] = []

      pipe(
        pipe(
          Effect.Do,
          Effect.flatMap(() => {
            functionThatThrowError()
            return Effect.void;
          }),
          Effect.catchAllCause((cause) =>
            Effect.logError('message in the log', cause)
          )
        ),

        Effect.provide(
          pipe(
            Layer.provideMerge(
              Layer.succeed(Clock.Clock, testClock),
              Logger.replace(
                Logger.defaultLogger,
                customLogger((a) => {
                  log.push(a)
                })
              )
            )
          )
        ),
        Effect.runSync
      )
      expect(log).toEqual([
        {
          annotations: {},
          level: 'ERROR',
          'logging.googleapis.com/spanId': undefined,
          'logging.googleapis.com/trace': undefined,
          message: 'message in the log',
          meta: {},
          exception: expect.stringContaining('functionThatThrowError'),
          parent: undefined,
          span: undefined,
          timestamp: expect.any(String),
        },
      ])
    })
  })
})

test('effect versions after span log changes', () => {
  let logs: any[] = []
  pipe(
    parent,
    Effect.provide(
      makeTestLayer((x) => {
        logs.push(x)
      })
    ),
    Effect.runSync
  )
  expect(logs).toEqual([
    {
      annotations: {},
      level: 'INFO',
      'logging.googleapis.com/spanId': 'child',
      'logging.googleapis.com/trace': 'parent',
      message: 'enter',
      meta: {},
      parent: {
        label: 'parent',
        startTime: 0,
      },
      span: {
        label: 'child',
        startTime: 0,
      },
      timestamp: '1970-01-01T00:00:00.000Z',
    },
  ])
})

test('logging - should be ok', () => {
  let log: unknown[] = []
  pipe(
    pipe(
      logInfo('test', { test: 'test' }),
      Effect.flatMap(() =>
        withTrace({
          trace: 'test-trace',
          span: 'test-span-child',
        })(logInfo('test-child', { test: 'test-child' }))
      ),
      withTrace({ trace: 'test-trace2', span: 'test-span2' })
    ),

    Effect.provide(
      pipe(
        Layer.provideMerge(
          Layer.succeed(Clock.Clock, testClock),
          Logger.replace(
            Logger.defaultLogger,
            customLogger((a) => {
              log.push(a)
            })
          )
        )
      )
    ),
    Effect.runSync
  )
  expect(log).toEqual([
    {
      annotations: {
        'logging.googleapis.com/spanId': 'test-span2',
        'logging.googleapis.com/trace': 'test-trace2',
      },
      level: 'INFO',
      message: 'test',
      'logging.googleapis.com/spanId': 'test-span2',
      'logging.googleapis.com/trace': undefined,
      meta: {
        test: 'test',
      },
      parent: undefined,
      span: {
        label: 'test-span2',
        startTime: expect.any(Number),
      },
      timestamp: expect.any(String),
    },
    {
      annotations: {
        'logging.googleapis.com/spanId': 'test-span-child',
        'logging.googleapis.com/trace': 'test-trace',
      },
      'logging.googleapis.com/spanId': 'test-span-child',
      'logging.googleapis.com/trace': 'test-span2',
      level: 'INFO',
      message: 'test-child',
      meta: {
        test: 'test-child',
      },
      parent: {
        label: 'test-span2',
        startTime: expect.any(Number),
      },
      span: {
        label: 'test-span-child',
        startTime: expect.any(Number),
      },
      timestamp: expect.any(String),
    },
  ])
})
