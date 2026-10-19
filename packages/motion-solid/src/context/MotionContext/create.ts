import { createMemo, useContext } from "solid-js"
import { MotionContext, type MotionContextProps } from "."
import type { MotionProps } from "../../motion/types"
import { getCurrentTreeVariants } from "./utils"

/**
 * Port note: returns a context object whose `initial`/`animate` getters track `getProps()` and the
 * parent context, instead of a memoized value recreated on render.
 */
export function useCreateMotionContext<Instance>(
    getProps: () => MotionProps
): MotionContextProps<Instance> {
    const parent = useContext(MotionContext)
    const variants = createMemo(
        () => {
            const { initial, animate } = getCurrentTreeVariants(
                getProps(),
                parent
            )
            return { initial, animate }
        },
        {
            equals: (a, b) =>
                variantLabelsAsDependency(a.initial) ===
                    variantLabelsAsDependency(b.initial) &&
                variantLabelsAsDependency(a.animate) ===
                    variantLabelsAsDependency(b.animate),
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.MotionContext.variants"
                    : undefined,
        }
    )

    return {
        visualElement: undefined,
        get initial() {
            return variants().initial
        },
        get animate() {
            return variants().animate
        },
    }
}

function variantLabelsAsDependency(
    prop: undefined | string | string[] | boolean
) {
    return Array.isArray(prop) ? prop.join(" ") : prop
}
