Hello! Thank you for your interest in contributing to `effect-use`.

## Adding a new package
1. Copy an existing one
2. Paste it and rename the folder
3. `yarn constraints --fix`
4. Some work...
5. Open a pull request

Please ensure the package follows the following form:

<your-package>/index.ts
```typescript
export const MyAPIId = '@effect/use/<my-name>' as const
export type MyAPI = <my-api-type>
export const MyAPI = Context.Tag<MyAPI>(MyAPIId)
```
