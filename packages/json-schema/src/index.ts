import * as S from '@effect/schema/Schema'
import { pipe } from '@effect/data/Function'
import * as O from '@effect/data/Option'
import { isRecord } from '@effect/data/Predicate'
import * as RA from '@effect/data/ReadonlyArray'
import * as Effect from '@effect/io/Effect'
import * as AST from '@effect/schema/AST'
import type { Schema } from '@effect/schema/Schema'
import ajv, { AnySchema } from 'ajv'
import {
  Annotated,
  DescriptionAnnotationId,
  JSONSchemaAnnotationId,
} from '@effect/schema/AST'

export const JSONSchemaAnnotationKey = S.union(
  S.literal('title', 'description', 'examples', '$comment'),
  pipe(
    S.templateLiteral(S.literal('x-'), S.string),
    S.message(
      (a) => 'JSON schema annotations must start with `x-`, received ' + a
    )
  )
)

// TODO. would be useful to constrict to json only for annotations, etc
const SDotJSON = S.unknown

export const JSONSchemaAnnotation = S.record(JSONSchemaAnnotationKey, SDotJSON)
export type JSONSchemaAnnotation = S.Schema<typeof JSONSchemaAnnotation>

export const jsonSchema =
  (x: Partial<Record<'title' | 'description' | `x-${string}`, Json>>) =>
  <A>(self: S.Schema<A>): S.Schema<A> =>
    S.make(AST.setAnnotation(self.ast, JSONSchemaAnnotationId, x))

/**
 * Provides the full set of JSON schema annotations for a type
 * Ensures annotations are valid according to JSON Schema
 * @param annotationIds
 * @param extra
 */
export const addJsonSchemaAnnotationsFrom =
  (annotationIds: string[], extra?: JSONSchemaAnnotation) =>
  <A>(self: S.Schema<A> & Annotated): S.Schema<A> =>
    jsonSchema({
      ...Object.fromEntries(
        annotationIds
          .map((annotationId) => {
            if (S.is(JSONSchemaAnnotationKey)(annotationId)) {
              return {
                annotationId: annotationId,
                jsonSchemaAnnotationKey: annotationId,
              }
            } else if (annotationId === DescriptionAnnotationId) {
              return {
                annotationId: annotationId,
                jsonSchemaAnnotationKey: 'description',
              }
            } else {
              return {
                annotationId: annotationId,
                jsonSchemaAnnotationId: `x-${annotationId}` as const,
              }
            }
          })
          .map(({ annotationId, jsonSchemaAnnotationKey }) => [
            jsonSchemaAnnotationKey,
            pipe(
              AST.getAnnotation(annotationId)(self),
              O.getOrNull,
              S.parse(SDotJSON)
            ),
          ])
      ),
      ...extra,
    })(self)

const ajvInstance = new ajv({
  allErrors: true,
  strict: true,
})

export const validateJSONSchema = (schema: AnySchema) =>
  Effect.try(() => {
    const result = ajvInstance.validateSchema(schema, false)
    if (result === true) {
      return true
    }
    throw ajvInstance.errorsText(ajvInstance.errors)
  })

///
export type JsonSchema7AnyType = {}

export type JsonSchema7NullType = {
  type: 'null'
}

export type JsonSchema7StringType = {
  type: 'string'
  minLength?: number
  maxLength?: number
}

export type JsonSchema7NumberType = {
  type: 'number' | 'integer'
  minimum?: number
  exclusiveMinimum?: number
  maximum?: number
  exclusiveMaximum?: number
}

export type JsonSchema7BooleanType = {
  type: 'boolean'
}

export type JsonSchema7ConstType = {
  const: string | number | boolean
}

export type JsonSchema7ArrayType = {
  type: 'array'
  items?: JsonSchema7Type | Array<JsonSchema7Type>
  minItems?: number
  maxItems?: number
  additionalItems?: JsonSchema7Type
}

export type JsonSchema7EnumType = {
  enum: Array<string | number>
}

export type JsonSchema7AnyOfType = {
  anyOf: ReadonlyArray<JsonSchema7Type>
}

export type JsonSchema7AllOfType = {
  allOf: Array<JsonSchema7Type>
}

export type JsonSchema7ObjectType = {
  type: 'object'
  required: Array<string>
  properties: { [x: string]: JsonSchema7Type }
  additionalProperties: boolean | JsonSchema7Type
}

export type JsonSchema7Type =
  | JsonSchema7AnyType
  | JsonSchema7NullType
  | JsonSchema7StringType
  | JsonSchema7NumberType
  | JsonSchema7BooleanType
  | JsonSchema7ConstType
  | JsonSchema7ArrayType
  | JsonSchema7EnumType
  | JsonSchema7AnyOfType
  | JsonSchema7AllOfType
  | JsonSchema7ObjectType

type JsonArray = ReadonlyArray<Json>

type JsonObject = { readonly [key: string]: Json }

type Json = null | boolean | number | string | JsonArray | JsonObject

const isJsonArray = (u: unknown): u is JsonArray =>
  Array.isArray(u) && u.every(isJson)

const isJsonObject = (u: unknown): u is JsonObject =>
  isRecord(u) && Object.keys(u).every((key) => isJson(u[key]))

export const isJson = (u: unknown): u is Json =>
  u === null ||
  typeof u === 'string' ||
  (typeof u === 'number' && !isNaN(u) && isFinite(u)) ||
  typeof u === 'boolean' ||
  isJsonArray(u) ||
  isJsonObject(u)

const getJSONSchemaAnnotation = AST.getAnnotation<AST.JSONSchemaAnnotation>(
  AST.JSONSchemaAnnotationId
)

/**
 * Returns the final JSON Schema annotations that are emitted by the compiler for the given AST node
 * Translates all built-in effect schema annotations that map to valid JSON schema annotations
 * Adds and favors explicitly declared JSONSchemaAnnotations
 * @param ast
 */
export const getEffectiveJSONSchemaAnnotations = (
  ast: AST.AST
): Partial<JSONSchemaAnnotation> => {
  const base = [
    [
      'title',
      pipe(ast, AST.getAnnotation(AST.TitleAnnotationId), O.getOrNull),
    ] as const,
    [
      'description',
      pipe(ast, AST.getAnnotation(AST.DescriptionAnnotationId), O.getOrNull),
    ] as const,
    [
      'examples',
      pipe(ast, AST.getAnnotation(AST.ExamplesAnnotationId), O.getOrNull),
    ] as const,
  ]
    .filter(([key, value]) => value !== null)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

  const overrides = pipe(ast, getJSONSchemaAnnotation, O.getOrNull)
  return { ...base, ...overrides }
}

export const jsonSchemaFor = <A>(schema: Schema<A>): JsonSchema7Type => {
  const go = (ast: AST.AST): JsonSchema7Type => {
    const annotations = getEffectiveJSONSchemaAnnotations(ast)
    switch (ast._tag) {
      case 'Declaration':
        return pipe(
          getJSONSchemaAnnotation(ast),
          O.match({
            onSome: (schema) => ({ ...go(ast.type), ...schema }),
            onNone: () => go(ast.type),
          })
        )
      case 'Literal': {
        if (typeof ast.literal === 'bigint') {
          return {} as any
        } else if (ast.literal === null) {
          return { type: 'null' }
        }
        return { ...annotations, const: ast.literal }
      }
      case 'UniqueSymbol':
        throw new Error('cannot convert a unique symbol to JSON Schema')
      case 'UndefinedKeyword':
        throw new Error('cannot convert `undefined` to JSON Schema')
      case 'VoidKeyword':
        throw new Error('cannot convert `void` to JSON Schema')
      case 'NeverKeyword':
        throw new Error('cannot convert `never` to JSON Schema')
      case 'UnknownKeyword':
      case 'AnyKeyword':
        return { ...annotations }
      case 'StringKeyword':
        return { ...annotations, type: 'string' }
      case 'NumberKeyword':
        return { ...annotations, type: 'number' }
      case 'BooleanKeyword':
        return { ...annotations, type: 'boolean' }
      case 'BigIntKeyword':
        throw new Error('cannot convert `bigint` to JSON Schema')
      case 'SymbolKeyword':
        throw new Error('cannot convert `symbol` to JSON Schema')
      case 'ObjectKeyword':
        return { ...annotations }
      case 'Tuple': {
        const elements = ast.elements.map((e) => go(e.type))
        const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
        const output: JsonSchema7ArrayType = { ...annotations, type: 'array' }
        let i = 0
        // ---------------------------------------------
        // handle elements
        // ---------------------------------------------
        for (; i < ast.elements.length; i++) {
          if (output.minItems === undefined) {
            output.minItems = 0
          }
          if (output.maxItems === undefined) {
            output.maxItems = 0
          }
          // ---------------------------------------------
          // handle optional elements
          // ---------------------------------------------
          if (!ast.elements[i].isOptional) {
            output.minItems = output.minItems + 1
            output.maxItems = output.maxItems + 1
          }
          if (output.items === undefined) {
            output.items = []
          }
          if (Array.isArray(output.items)) {
            output.items.push(elements[i])
          }
        }
        // ---------------------------------------------
        // handle rest element
        // ---------------------------------------------
        if (O.isSome(rest)) {
          const head = RA.headNonEmpty(rest.value)
          if (output.items !== undefined) {
            delete output.maxItems
            output.additionalItems = head
          } else {
            output.items = head
          }
          // ---------------------------------------------
          // handle post rest elements
          // ---------------------------------------------
          // const tail = RA.tailNonEmpty(rest.value)
        }

        return output
      }
      case 'TypeLiteral': {
        if (
          ast.indexSignatures.length <
          ast.indexSignatures.filter(
            (is) => is.parameter._tag === 'StringKeyword'
          ).length
        ) {
          throw new Error(`Cannot encode some index signature to JSON Schema`)
        }
        const propertySignatures = ast.propertySignatures.map((ps) =>
          go(ps.type)
        )
        const indexSignatures = ast.indexSignatures.map((is) => go(is.type))
        const output: JsonSchema7ObjectType = {
          ...annotations,
          type: 'object',
          required: [],
          properties: {},
          additionalProperties: false,
        }
        // ---------------------------------------------
        // handle property signatures
        // ---------------------------------------------
        for (let i = 0; i < propertySignatures.length; i++) {
          const name = ast.propertySignatures[i].name
          if (typeof name === 'string') {
            output.properties[name] = propertySignatures[i]
            // ---------------------------------------------
            // handle optional property signatures
            // ---------------------------------------------
            if (!ast.propertySignatures[i].isOptional) {
              output.required.push(name)
            }
          } else {
            throw new Error(`Cannot encode ${String(name)} key to JSON Schema`)
          }
        }
        // ---------------------------------------------
        // handle index signatures
        // ---------------------------------------------
        if (indexSignatures.length > 0) {
          output.additionalProperties = { allOf: indexSignatures }
        }

        return output
      }
      case 'Union':
        return { ...annotations, anyOf: ast.types.map(go) }
      case 'Enums':
        return {
          ...annotations,
          anyOf: ast.enums.map(([_, value]) => ({ const: value })),
        }
      case 'Refinement': {
        const from = go(ast.from)
        return pipe(
          getJSONSchemaAnnotation(ast),
          O.match({
            onNone: () => from,
            onSome: (schema) => ({ ...from, ...schema }),
          })
        )
      }
    }
    throw new Error(`unhandled ${ast._tag}`)
  }

  return go(schema.ast)
}
////
