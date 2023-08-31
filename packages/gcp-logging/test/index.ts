// @ts-nocheck
import { pipe } from '@effect/data/Function'
import * as Effect from '@effect/io/Effect'
import * as Logger from '@effect/io/Logger'
import * as Duration from '@effect/data/Duration'
import * as Clock from '@effect/io/Clock'
import { ClockTypeId } from '@effect/io/Clock'
import * as Layer from '@effect/io/Layer'
import { customLogger, withTrace, logInfo } from '../src'

const testClock: Clock.Clock = {
  [Clock.ClockTypeId]: ClockTypeId,
  get currentTimeMillis(): Effect.Effect<never, never, number> {
    return Effect.succeed(0)
  },
  sleep(duration: Duration.Duration): Effect.Effect<never, never, void> {
    return Effect.unit
  },
  unsafeCurrentTimeMillis(): number {
    return 0
  },
  get currentTimeNanos(): Effect.Effect<never, never, bigint> {
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
  Layer.provideMerge(
    Effect.setClock(testClock),
    Logger.replace(
      Logger.defaultLogger,
      customLogger((a) => {
        onLog(a)
      })
    )
  )

test('effect versions after span log changes', () => {
  let logs = []
  pipe(
    parent,
    Effect.provideLayer(
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

test.skip('logging - should be ok', () => {
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
      withTrace({ trace: 'test-trace', span: 'test-span' })
    ),

    Effect.provideSomeLayer(
      pipe(
        Layer.provideMerge(
          Effect.setClock(testClock),
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
        'logging.googleapis.com/spanId': 'test-span',
        'logging.googleapis.com/trace': 'test-trace',
      },
      level: 'INFO',
      message: 'test',
      'logging.googleapis.com/spanId': 'test-span',
      'logging.googleapis.com/trace': 'test-trace',
      meta: {
        test: 'test',
      },
      span: {
        label: 'test-span',
        startTime: 0,
      },
      timestamp: '1970-01-01T00:00:00.000Z',
    },
    {
      annotations: {
        'logging.googleapis.com/spanId': 'test-span-child',
        'logging.googleapis.com/trace': 'test-trace',
      },
      'logging.googleapis.com/spanId': 'test-span-child',
      'logging.googleapis.com/trace': 'test-trace',
      level: 'INFO',
      message: 'test-child',
      meta: {
        test: 'test-child',
      },
      parent: {
        label: 'test-span',
        startTime: 0,
      },
      span: {
        label: 'test-span-child',
        startTime: 0,
      },
      timestamp: '1970-01-01T00:00:00.000Z',
    },
  ])
})
