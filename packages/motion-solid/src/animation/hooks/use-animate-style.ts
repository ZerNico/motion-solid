import { useUnmountEffect } from "../../utils/use-unmount-effect"
import { createScopedWaapiAnimate } from "../animators/waapi/animate-style"
import { createAnimationScope, type SolidAnimationScope } from "./scope"

/**
 * Like `useAnimate`, with the smaller WAAPI-only `animate`.
 *
 * @public
 */
export function useAnimateMini<T extends Element = any>() {
    const scope = createAnimationScope<T>()

    const animate = createScopedWaapiAnimate(scope)

    useUnmountEffect(() => {
        scope.animations.forEach((animation) => animation.stop())
    })

    return [scope, animate] as [SolidAnimationScope<T>, typeof animate]
}
