import { motionComponentSymbol } from "./symbol"

/**
 * Checks if a component is a `motion` component.
 *
 * Port note: motion components are functions in Solid (upstream's are `forwardRef` objects).
 */
export function isMotionComponent(component: unknown) {
    return (
        component !== null &&
        (typeof component === "object" || typeof component === "function") &&
        motionComponentSymbol in (component as object)
    )
}
