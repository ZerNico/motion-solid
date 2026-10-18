import { untrack, useContext } from "solid-js"
import { MotionConfigContext } from "../../context/MotionConfigContext"
import { useReducedMotionConfig } from "../../utils/reduced-motion/use-reduced-motion-config"
import { useUnmountEffect } from "../../utils/use-unmount-effect"
import { createScopedAnimate } from "../animate"
import { createAnimationScope, type SolidAnimationScope } from "./scope"

/**
 * Creates an `animate` function scoped to an element: selectors are resolved within it, and its
 * animations stop when the component is disposed.
 *
 * ```jsx
 * const [scope, animate] = useAnimate()
 *
 * onSettled(() => {
 *   animate("li", { opacity: 1 })
 * })
 *
 * return <ul ref={scope}>...</ul>
 * ```
 *
 * Port note: `scope` is a ref callback (with `current` and `animations`, like upstream's ref).
 *
 * @public
 */
export function useAnimate<T extends Element = any>() {
    const scope = createAnimationScope<T>()

    const reduceMotion = useReducedMotionConfig()
    const config = useContext(MotionConfigContext)

    /**
     * Port note: upstream reads the reduced motion and `skipAnimations` settings once. Here they're
     * read when animating, so they follow `MotionConfig` and the device setting.
     */
    const animate = ((...args: any[]) =>
        (
            createScopedAnimate({
                scope,
                reduceMotion: untrack(reduceMotion) ?? undefined,
                skipAnimations: untrack(() => config.skipAnimations),
            }) as any
        )(...args)) as ReturnType<typeof createScopedAnimate>

    useUnmountEffect(() => {
        scope.animations.forEach((animation) => animation.stop())
        scope.animations.length = 0
    })

    return [scope, animate] as [SolidAnimationScope<T>, typeof animate]
}
