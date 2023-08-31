import * as Effect from '@effect/io/Effect'
import * as Context from '@effect/data/Context'
import { Octokit } from '@octokit/rest'
import { pipe } from '@effect/data/Function'
import * as Layer from '@effect/io/Layer'

export const GitHub = Context.Tag<Octokit>('GitHub')

/**
 * Returns the contents of a file from a GitHub repository
 *
 * @example
 * ```typescript
 * import { GitHub, getFileContents, makeGitHubLayer } from '@effect-use/github'
 *
 * pipe(
 *  {
 *    owner: 'embedded-insurance',
 *    repo: 'umbrella',
 *    path: 'packages/effect-github/README.md',
 *  },
 *   getFileContents,
 *   Effect.provideLayer( makeGitHubLayer('my-github-token')),
 *   Effect.runPromise
 * )
 * ```
 */
export const getFileContents = (args: {
  owner: string
  repo: string
  path: string
}) =>
  Effect.flatMap(GitHub, (api) =>
    pipe(
      Effect.tryPromise(() =>
        api.repos.getContent({
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
          ...args,
        })
      ),
      Effect.flatMap((x) =>
        Array.isArray(x) ? Effect.fail(x) : Effect.succeed(x)
      )
    )
  )

/**
 * Creates or updates a file in a GitHub repository
 * @example
 * ```typescript
 * import { GitHub, createOrUpdateFileContents, makeGitHubLayer } from '@effect-use/github'
 *
 *  pipe(
 *    {
 *      owner: 'embedded-insurance',
 *      repo: 'effect-use',
 *      path: 'packages/github/README.md',
 *      content: 'Hello World!',
 *      message: 'Update README.md',
 *      sha: '1234567890',
 *      committer: {
 *        name: 'ei-bot',
 *        email: 'hello@example.com'
 *      }
 *    },
 *    createOrUpdateFileContents,
 *    Effect.provideLayer(makeGitHubLayer('my-github-token')),
 *    Effect.runPromise
 *  )
 *
 * @param args
 */
export const createOrUpdateFileContents = (args: {
  owner: string
  repo: string
  path: string
  content: string
  message: string
  sha: string
  committer: {
    name: string
    email: string
  }
}) =>
  Effect.flatMap(GitHub, (api) =>
    Effect.tryPromise(() =>
      api.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
        ...args,
      })
    )
  )

export const makeGitHubLayer = (token?: string) =>
  Layer.succeed(GitHub, GitHub.of(new Octokit({ auth: token })))
