import {
  defineQuery,
  defineSignal,
  setHandler,
  Trigger,
} from '@temporalio/workflow'

export const aWorkflow = async () => {
  let state = { signals: [] }
  const t = new Trigger()
  console.log('aWorkflow')
  const signal = defineSignal('hello')
  // @ts-ignore
  setHandler(signal, (args) => {
    console.log('signal received', args)
    // @ts-ignore
    state.signals.push(args)
  })
  const query = defineQuery('state')
  // @ts-ignore
  setHandler(query, () => {
    console.log('query received')
    return state
  })

  await t
}
