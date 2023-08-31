# @effect-use/github

> GitHub API for [Effect](https://github.com/Effect-TS/effect)

This library provides an easy way to make GitHub API calls.

Usage:

```typescript
import { GitHub, getFileContents, makeGitHubLayer } from '@effect-use/github'

pipe(
  {
    owner: 'embedded-insurance',
    repo: 'effect-use',
    path: 'packages/github/README.md',
  },
  getFileContents,
  Effect.provideLayer(makeGitHubLayer('my-github-token')),
  Effect.runPromise
)
```
