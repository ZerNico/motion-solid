import { $PROXY, untrack, type Accessor } from "solid-js"

/**
 * Port note: Solid-only. Upstream hooks get new arguments on every render. Here, arguments that
 * can change are passed as accessors (`() => props.max`), and options objects are read lazily
 * (pass an accessor of the options, or an object with getters). Plain values work like upstream.
 */
export type MaybeAccessor<T> = T | Accessor<T>

export function access<T>(value: MaybeAccessor<T>): T {
    return typeof value === "function" ? (value as Accessor<T>)() : value
}

/**
 * Reads an options object (or an accessor of one) with all its keys, so a computation reading
 * it tracks its getters.
 */
export function readOptions<T extends object>(
    options: MaybeAccessor<T | undefined>
): T | undefined {
    const value = access(options)
    return value ? { ...value } : undefined
}

/**
 * Whether an object can't change: not a store, without getters, and the same for the plain
 * objects and arrays in it (e.g. an `ease` array in options).
 */
export function isConstantObject(object: object): boolean {
    if (untrack(() => (object as any)[$PROXY])) return false
    return Object.values(Object.getOwnPropertyDescriptors(object)).every(
        (descriptor) =>
            !descriptor.get &&
            (!isPlainContainer(descriptor.value) ||
                isConstantObject(descriptor.value))
    )
}

function isPlainContainer(value: unknown): value is object {
    if (!value || typeof value !== "object") return false
    if (Array.isArray(value)) return true
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}
