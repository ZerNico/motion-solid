import {
    AnyResolvedKeyframe,
    buildHTMLStyles,
    isForcedMotionValue,
    isMotionValue,
    MotionValue,
} from "motion-dom"
import type { MotionProps } from "../../motion/types"
import type { ResolvedValues } from "../types"
import { toSolidStyle } from "../dom/utils/style"
import { createHtmlRenderState } from "./utils/create-render-state"

export function copyRawValuesOnly(
    target: ResolvedValues,
    source: { [key: string]: AnyResolvedKeyframe | MotionValue },
    props: MotionProps
) {
    for (const key in source) {
        if (!isMotionValue(source[key]) && !isForcedMotionValue(key, props)) {
            target[key] = source[key] as AnyResolvedKeyframe
        }
    }
}

/**
 * Port note: upstream memoizes this on the (constant) visual state. Callers here compute it once.
 */
export function buildInitialMotionValues(
    { transformTemplate }: MotionProps,
    visualState: ResolvedValues
) {
    const state = createHtmlRenderState()

    buildHTMLStyles(state, visualState, transformTemplate)

    return Object.assign({}, state.vars, state.style)
}

function getStyle(
    props: MotionProps,
    initialMotionValues: ResolvedValues
): ResolvedValues {
    const styleProp = props.style || {}
    const style = {}

    /**
     * Copy non-Motion Values straight into style
     */
    copyRawValuesOnly(style, styleProp as any, props)

    Object.assign(style, initialMotionValues)

    return style
}

/**
 * Port note: upstream's `useHTMLProps` hook runs on every render. This returns a function that
 * builds the same props from the current motion props, for a memo, with `style` converted for
 * Solid's `style` binding (kebab-case keys, string values) and Solid's lowercase `tabindex`.
 */
export function createHTMLProps(
    initialProps: MotionProps,
    visualState: ResolvedValues
) {
    const initialMotionValues = buildInitialMotionValues(
        initialProps,
        visualState
    )

    return (props: MotionProps & Record<string, any>) => {
        const htmlProps: Record<string, any> = {}
        const style = getStyle(props, initialMotionValues)

        if (props.drag && props.dragListener !== false) {
            // Disable the ghost element when a user drags
            // Port note: a string, Solid removes attributes set to `false`.
            htmlProps.draggable = "false"

            // Disable text selection
            style.userSelect =
                style.WebkitUserSelect =
                style.WebkitTouchCallout =
                    "none"

            // Disable scrolling on the draggable direction
            style.touchAction =
                props.drag === true
                    ? "none"
                    : `pan-${props.drag === "x" ? "y" : "x"}`
        }

        if (
            props.tabindex === undefined &&
            (props.onTap || props.onTapStart || props.whileTap)
        ) {
            htmlProps.tabindex = 0
        }

        htmlProps.style = toSolidStyle(style)

        return htmlProps
    }
}
