import { onCleanup } from "solid-js"

/**
 * Port note: upstream runs a layout effect after every render (`deps` decide when it re-runs).
 * Solid components run once: the effect runs once, when the hook is called, and its cleanup when
 * the component is disposed. The copied upstream hooks only use it to subscribe to motion values.
 */
export function useIsomorphicLayoutEffect(
    effect: () => void | VoidFunction,
    _deps?: unknown[]
) {
    const cleanup = effect()
    if (typeof cleanup === "function") onCleanup(cleanup)
}
