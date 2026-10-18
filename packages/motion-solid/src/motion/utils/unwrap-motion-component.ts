import type { Component } from "solid-js"
import { isMotionComponent } from "./is-motion-component"
import { motionComponentSymbol } from "./symbol"

/**
 * Unwraps a `motion` component and returns either a string for `motion.div` or
 * the component for `motion.create(Component)`.
 *
 * If the component is not a `motion` component it returns undefined.
 */
export function unwrapMotionComponent(
    component: unknown
): Component<any> | string | undefined {
    if (isMotionComponent(component)) {
        return (component as any)[motionComponentSymbol]
    }

    return undefined
}
