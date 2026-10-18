type Init<T> = () => T

/**
 * Creates a constant value over the lifecycle of a component.
 *
 * Port note: a Solid component runs once, so this is `init()`. Kept so the hooks copied from
 * upstream stay unchanged.
 */
export function useConstant<T>(init: Init<T>) {
    return init()
}
