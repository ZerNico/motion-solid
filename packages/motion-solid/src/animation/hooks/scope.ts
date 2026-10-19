import type { AnimationScope } from "motion-dom"

/**
 * Port note: Solid-only. Upstream's scope is a React ref object (`ref={scope}`). Here it's a ref
 * callback that's also the scope: `<div ref={scope}>` sets `scope.current`.
 */
export type SolidAnimationScope<T extends Element = any> = AnimationScope<T> &
    ((element: T) => void)

export function createAnimationScope<
    T extends Element = any,
>(): SolidAnimationScope<T> {
    const scope = ((element: T) => {
        ;(scope as { current: T }).current = element
    }) as SolidAnimationScope<T>
    ;(scope as { current: T | null }).current = null
    scope.animations = []
    return scope
}
