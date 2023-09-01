<h1 align="center">
<br/>

  
  💁 
  
  
  effect-use
  </h1>

  > <p align="center">Functional dependency injection packages</p>
<br/>

<br/>

`effect-use` conjures your favorite API from the ether, makes your software testable, and lets you write the anti-boilerplate.


## Why?
- 🪄 Your API anywhere, anytime.
- ✅ Testable programs, out of the box. 
- ⏱️ Write code that hasn't been written.


## Project Status
Alpha software, subject to change.

## Packages
- [`@effect-use/aws-s3`](./packages/aws-s3) - Interact with AWS S3 buckets (via `@aws/client-s3`)
- [`@effect-use/gcp-gcs`](./packages/gcp-gcs) - Interact with Google Cloud Storage (GCS) (via `@google-cloud/storage`)
- [`@effect-use/gcp-logging`](./packages/gcp-logging) - Log traces and spans with Google Cloud Stackdriver
- [`@effect-use/temporal-client`](./packages/temporal-client) - Signal or start workflows (via `@temporalio/client`)
- [`@effect-use/temporal-config`](./packages/temporal-config) - Define, require Temporal connection configuration
- [`@effect-use/github`](./packages/github) - Interact with the GitHub API (via `@octokit/rest`)
- [`@effect-use/stripe`](./packages/stripe) - WIP
- [`@effect-use/brex`](./packages/brex) - WIP
- [`@effect-use/kubernetes`](./packages/kubernetes) - WIP

## Usage
```typescript
import { GitHub } from '@effect-use/github'

const getOrWhoops = pipe(
  Effect.flatMap(GitHub, github => github.getRepo({owner: 'embedded-insurance', repo: 'effect-use'})),
  Effect.map(result => result.repo.latestCommit()),
  Effect.mapError(e => ({_tag: "Whoops"}))
)

// Let's provide our dependencies
// And instead of the real GitHub, let's just make something up that looks exactly like it.
// a.k.a., "it satisfies the interface"
const dependencies = Layer.succeed(GitHub, {getRepo: (args: any)=> ({latestCommit:'125'}))
pipe(
  getOrWhoops,
  Effect.provideLayer(
)

```

