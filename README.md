<h1 align="center">
<br/>

  
  💁 
  
  
  effect-use
  </h1>


effect-use is a library that collects common [Effect](https://github.com/Effect-TS/effect) wrappers in one place for developer convenience.


## Project Status
Alpha software, subject to change.



## Packages
- [`@effect-use/aws-s3`](./packages/aws-s3) - Interact with AWS S3 buckets (via `@aws/client-s3`)
- [`@effect-use/gcp-gcs`](./packages/gcp-gcs) - Interact with Google Cloud Storage (GCS) (via `@google-cloud/storage`)
- [`@effect-use/gcp-logging`](./packages/gcp-logging) - Log traces and spans with Google Cloud Stackdriver
- [`@effect-use/temporal-client`](./packages/temporal-client) - Signal or start workflows (via `@temporalio/client`)
- [`@effect-use/temporal-config`](./packages/temporal-config) - Define, require Temporal connection configuration
- [`@effect-use/github`](./packages/github) - Interact with the GitHub API (via `@octokit/rest`)
- [`@effect-use/stripe`](./packages/stripe) - Process payments with [Stripe](https://stripe.com/docs/api)
- [`@effect-use/brex`](./packages/brex) - Move money with the [Brex API](https://developer.brex.com/)
- [`@effect-use/kubernetes`](./packages/kubernetes) - WIP

## Usage
```typescript
import { GitHub } from '@effect-use/github'
import { Effect, Layer, pipe } from 'effect'

const getLatestCommit = pipe(
  Effect.flatMap(GitHub, github => github.getRepo({owner: 'embedded-insurance', repo: 'effect-use'})),
  Effect.map(result => result.repo.latestCommit),
  Effect.mapError(e => ({ _tag: "Whoops" }))
)

// Let's provide our dependencies
// And instead of the real GitHub, let's just make something up that looks exactly like it.
// a.k.a., "it satisfies the interface"
const GitHubLayerTest = Layer.succeed(GitHub, {
  getRepo: (args: any)=> ({ latestCommit: '125' })
} as GitHub)

const result = pipe(
  getLatestCommit,
  Effect.provide(GitHubLayerTest),
  Effect.runPromise
)

expect(result).toEqual({latestCommit: '125'})
```

