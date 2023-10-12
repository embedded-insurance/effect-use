/**
 * A `PromiseLike` helper which exposes its `resolve` and `reject` methods.
 *
 * Vanilla version, copied from @temporalio/workflow
 */
export class Trigger<T> implements PromiseLike<T> {
  // Typescript does not realize that the promise executor is run synchronously in the constructor
  // @ts-expect-error
  public resolve: (value?: T | PromiseLike<T>) => void
  // @ts-expect-error
  public reject: (reason?: any) => void
  protected readonly promise: Promise<T>

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve as any
      this.reject = reject
    })
    // Avoid unhandled rejections(...?)
    this.promise.catch(() => undefined)
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected)
  }
}
