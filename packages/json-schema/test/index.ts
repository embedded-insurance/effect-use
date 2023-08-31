import * as S from '@effect/schema/Schema'
import { jsonSchema, jsonSchemaFor, validateJSONSchema } from '../src'
import * as Effect from '@effect/io/Effect'
import { pipe } from '@effect/data/Function'
import * as AST from '@effect/schema/AST'

test('valid json schema', () => {
  expect(Effect.runSync(validateJSONSchema(jsonSchemaFor(S.string)))).toEqual(
    true
  )
})

test('invalid json schema', () => {
  pipe(
    validateJSONSchema('' as any),
    Effect.match({
      onFailure: (e) => expect(e).toEqual('data must be object,boolean'),
      onSuccess: () => fail('should not have succeeded'),
    }),
    Effect.runSync
  )
})

export const KafkaAnnotationId = '@effect-use/schema/KafkaAnnotationId'

export const kafkaTopic =
  (x: string) =>
  <A>(self: S.Schema<A>): S.Schema<A> =>
    S.make(AST.setAnnotation(self.ast, KafkaAnnotationId, x))

test('complex effect schema type', () => {
  const someSchema = pipe(
    S.union(
      S.struct({ type: S.literal('a') }),
      S.struct({ type: S.literal('b') })
    ),
    S.examples([{ type: 'a' }, { type: 'b' }]),
    kafkaTopic('test'),
    jsonSchema({ 'x-kafka-topic': 'test' })
    // S.annotations({
    //   [KafkaAnnotationId]: 'test',
    //   [JSONSchemaAnnotationId]: { title: 'test' },
    //   jsonSchema: { title: 'test' },
    // })
  )
  expect(
    pipe(someSchema, jsonSchemaFor, validateJSONSchema, Effect.runSync)
  ).toEqual(true)
  expect(jsonSchemaFor(someSchema)).toEqual({
    anyOf: [
      {
        additionalProperties: false,
        properties: { type: { const: 'a' } },
        required: ['type'],
        type: 'object',
      },
      {
        additionalProperties: false,
        properties: { type: { const: 'b' } },
        required: ['type'],
        type: 'object',
      },
    ],
    examples: [{ type: 'a' }, { type: 'b' }],
    'x-kafka-topic': 'test',
  })
})

test('complex effect schema type2', () => {
  const someSchema = pipe(
    S.union(
      S.struct({ type: S.literal('a') }),
      S.struct({ type: S.literal('b') })
    ),
    S.examples([{ type: 'a' }, { type: 'b' }]),
    kafkaTopic('test'),
    jsonSchema({ 'x-kafka-topic': 'test' })
    // S.annotations({
    //   [KafkaAnnotationId]: 'test',
    //   [JSONSchemaAnnotationId]: { title: 'test' },
    //   jsonSchema: { title: 'test' },
    // })
  )
  expect(
    pipe(someSchema, jsonSchemaFor, validateJSONSchema, Effect.runSync)
  ).toEqual(true)
  expect(jsonSchemaFor(someSchema)).toEqual({
    anyOf: [
      {
        additionalProperties: false,
        properties: { type: { const: 'a' } },
        required: ['type'],
        type: 'object',
      },
      {
        additionalProperties: false,
        properties: { type: { const: 'b' } },
        required: ['type'],
        type: 'object',
      },
    ],
    examples: [{ type: 'a' }, { type: 'b' }],
    'x-kafka-topic': 'test',
  })
})

test('should generate json schema with built in effect annotations', () => {
  const someSchema = pipe(
    S.union(
      S.struct({ type: S.literal('a') }),
      S.struct({ type: S.literal('b') })
    ),
    S.examples([{ type: 'a' }, { type: 'b' }]),
    S.title('test title'),
    S.description('test description')
  )
  expect(
    pipe(someSchema, jsonSchemaFor, validateJSONSchema, Effect.runSync)
  ).toEqual(true)
  expect(jsonSchemaFor(someSchema)).toEqual({
    anyOf: [
      {
        additionalProperties: false,
        properties: { type: { const: 'a' } },
        required: ['type'],
        type: 'object',
      },
      {
        additionalProperties: false,
        properties: { type: { const: 'b' } },
        required: ['type'],
        type: 'object',
      },
    ],
    description: 'test description',
    title: 'test title',
    examples: [{ type: 'a' }, { type: 'b' }],
  })
})
