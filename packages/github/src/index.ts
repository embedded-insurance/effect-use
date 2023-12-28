import * as Effect from 'effect/Effect'
import * as Context from 'effect/Context'
import { Octokit } from '@octokit/rest'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as S from '@effect/schema/Schema'

export type GitHub = Octokit
export const GitHub = Context.Tag<GitHub>('GitHub')

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
 *   Effect.provide( makeGitHubLayer('my-github-token')),
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

export const GitCommit = S.struct({
  sha: S.string,
  node_id: S.string,
  url: S.string,
  author: S.struct({
    date: S.string,
    email: S.string,
    name: S.string,
  }),
  committer: S.struct({
    date: S.string,
    email: S.string,
    name: S.string,
  }),
  message: S.string,
  tree: S.struct({
    sha: S.string,
    url: S.string,
  }),
  parents: S.array(
    S.struct({
      sha: S.string,
      url: S.string,
      html_url: S.string,
    })
  ),
  verification: S.struct({
    verified: S.boolean,
    reason: S.string,
    signature: S.nullable(S.string),
    payload: S.nullable(S.string),
  }),
  html_url: S.string,
})
export type GitCommit = S.Schema.To<typeof GitCommit>

// https://docs.github.com/en/rest/git/commits?apiVersion=2022-11-28#get-a-commit-object
export const getCommit = (args: {
  owner: string
  repo: string
  commit_sha: string
}): Effect.Effect<GitHub, unknown, GitCommit> =>
  Effect.flatMap(GitHub, (api) =>
    Effect.tryPromise(() =>
      api
        .request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
          headers: { 'X-GitHub-Api-Version': '2022-11-28' },
          ...args,
        })
        .then((x) => x.data)
    )
  )
