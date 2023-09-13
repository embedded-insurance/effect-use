import { TestWorkflowEnvironment } from '@temporalio/testing'
import * as Layer from '@effect/io/Layer'
import { TemporalClient } from '../src'
import { pipe } from '@effect/data/Function'
import * as Effect from '@effect/io/Effect'
import { signalWithStart } from '../src'
import { Worker } from '@temporalio/worker'
import { Trigger } from './lib/Trigger'

let testEnv: TestWorkflowEnvironment
beforeAll(async () => {
  testEnv = await TestWorkflowEnvironment.createLocal()
})
afterAll(async () => {
  await testEnv?.teardown()
})
test('signalWithStart - should be idempotent', async () => {
  const worker = await Worker.create({
    connection: testEnv.nativeConnection,
    namespace: 'default',
    taskQueue: 'test',
    workflowsPath: require.resolve('./lib/a-workflow'),
  })

  const t1 = new Trigger()
  let seqId = -1
  const signal = () => {
    seqId += 1
    return pipe(
      pipe(
        signalWithStart({
          workflowId: 'test',
          workflowType: 'aWorkflow',
          signal: 'hello',
          signalArgs: [{ seqId }],
          taskQueue: 'test',
          workflowExecutionTimeout: '1m',
        }),
        Effect.tap((a) =>
          pipe(
            Effect.logInfo('signalWithStart'),
            Effect.annotateLogs({
              workflowId: a.workflowId,
              signaledRunId: a.signaledRunId,
              seqId,
            })
          )
        )
      ),
      Effect.provideLayer(Layer.succeed(TemporalClient, testEnv.client)),
      Effect.either,
      Effect.runPromise
    )
  }

  await signal()

  const p = worker.runUntil(
    // @ts-ignore
    t1
  )

  expect(worker.getState() === 'RUNNING').toEqual(true)

  await signal()

  await signal()

  t1.resolve()

  await p
})
