import * as S from '@effect/schema/Schema'
import {
  AsyncAPI,
  isAsyncAPIValidationError,
  jsonSchemaFor,
  validateAsyncAPI,
} from '../src'
import { pipe } from '@effect/data/Function'
import * as yaml from 'js-yaml'

const x: AsyncAPI = {
  asyncapi: '2.0.0',
  info: {
    title: 'Example API',
    version: '1.0.0',
    description: 'An example AsyncAPI file',
    license: {
      name: 'Apache 2.0',
      url: 'https://www.apache.org/licenses/LICENSE-2.0',
    },
  },
  servers: {
    production: {
      url: 'api.example.com:{port}',
      protocol: 'mqtts',
      protocolVersion: '1.2.0',
      description: 'Test broker',
      variables: {
        port: {
          description:
            'Secure connection (TLS) is available through port 8883.',
          default: '1883',
          enum: ['1883', '8883'],
        },
      },
    },
    development: {
      url: 'localhost:{port}/{basePath}',
      protocol: 'mqtt',
      protocolVersion: '3.1.1',
      description: 'Local development broker',
      variables: {
        port: {
          default: '1883',
        },
        basePath: {
          default: 'v2',
        },
      },
    },
  },
  defaultContentType: 'application/json',
  channels: {
    'user/signedup': {
      description:
        'This channel is used to let you know when a user signed up.',
      subscribe: {
        summary: 'A user signed up',
        operationId: 'userSignedUp',
        message: {
          name: 'userSignedUp',
          title: 'User signed up',
          summary: 'This message is sent to notify you that a user signed up.',
          contentType: 'application/json',
          payload: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    description: 'The user id.',
                  },
                  firstName: {
                    type: 'string',
                    description: 'The user first name.',
                  },
                },
              },
            },
          },
        },
      },
    },
    // a command
    'user/signout': {
      description:
        'This channel is used to let you know when a user signed out.',
      publish: {
        summary: 'A user signed out',
        operationId: 'userSignedOut',
        message: {
          name: 'userSignedOut',
          title: 'User signed out',
          summary: 'This message is sent to notify you that a user signed out.',
          contentType: 'application/json',
          payload: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    description: 'The user id.',
                  },
                  firstName: {
                    type: 'string',
                    description: 'The user first name.',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
const convertSignalPayloadType = (x: S.Schema<any>) => {
  return jsonSchemaFor(x)
}

const signalsToAsyncAPI = (args: {
  workflowName: string
  signalMap: Record<string, S.Schema<any>>
}): AsyncAPI => {
  return {
    asyncapi: '2.6.0',
    info: {
      title: `\`${args.workflowName}\` Workflow Signals`,
      // TODO. could be version of workflow but may want to version separately
      version: '0.0.0',
    },
    channels: Object.fromEntries(
      Object.entries(signalMap).map(([signalName, schema]) => [
        signalName,
        {
          publish: {
            message: {
              messageId: signalName,
              description: `Signal \`${signalName}\` for workflow \`${args.workflowName}\``,
              // @ts-ignore
              payload: jsonSchemaFor(schema),
            },
          },
        },
      ])
    ),
  }
}

const StartInsuranceWorkflowPayload = S.struct({
  id: S.string,
})
const BindPolicyPayload = S.struct({ quote_id: S.string })
const signalMap = {
  'ei.start-insurance-workflow': StartInsuranceWorkflowPayload,
  'ei.bind-policy': BindPolicyPayload,
}

test.skip('print', async () => {
  expect(
    await pipe(
      signalsToAsyncAPI({ workflowName: 'policy', signalMap }),
      yaml.dump
      // validateAsyncAPI,
      // Effect.map(isAsyncAPIValidationError),
      // Effect.runPromise
    )
  ).toEqual(true)
})
