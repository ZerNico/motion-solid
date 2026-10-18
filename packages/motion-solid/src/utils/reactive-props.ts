import { $PROXY, type Accessor } from "solid-js"

/**
 * Port note: Solid-only. A props object that reads its keys and values from `source()`, marked
 * with Solid's `$PROXY` so a JSX spread tracks it like a store.
 */
export function reactiveProps<T extends Record<string, any>>(
    source: Accessor<T>
): T {
    return new Proxy({} as T, {
        get: (_target, key, receiver) => {
            if (key === $PROXY) return receiver
            /**
             * Solid's own symbols (`merge` asks a proxy for its internal record when a component
             * is set up): props have no symbol keys, and reading `source()` there would be an
             * untracked read.
             */
            if (typeof key === "symbol") return undefined
            return source()[key as keyof T]
        },
        has: (_target, key) => key === $PROXY || key in source(),
        ownKeys: () => Reflect.ownKeys(source()),
        getOwnPropertyDescriptor: (_target, key) =>
            key in source()
                ? {
                      configurable: true,
                      enumerable: true,
                      get: () => source()[key as keyof T],
                  }
                : undefined,
        set: () => false,
        defineProperty: () => false,
        deleteProperty: () => false,
    })
}
