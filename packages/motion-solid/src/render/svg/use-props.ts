import {
    buildSVGAttrs,
    camelCaseAttributes,
    camelToDash,
    isSVGTag,
} from "motion-dom"
import type { Component } from "solid-js"
import type { MotionProps } from "../../motion/types"
import { toSolidStyle } from "../dom/utils/style"
import { copyRawValuesOnly } from "../html/use-props"
import type { ResolvedValues } from "../types"
import { createSvgRenderState } from "./utils/create-render-state"

/**
 * Port note: see `createHTMLProps`.
 */
export function createSVGProps(
    initialProps: MotionProps,
    visualState: ResolvedValues,
    Component: string | Component<any>
) {
    const state = createSvgRenderState()

    buildSVGAttrs(
        state,
        visualState,
        isSVGTag(Component),
        initialProps.transformTemplate,
        initialProps.style
    )

    /**
     * Port note: Solid sets attributes by their DOM name, so they're converted like motion-dom's
     * `renderSVG` does (`strokeWidth` → `stroke-width`, `viewBox` stays).
     */
    const attrs: Record<string, any> = {}
    for (const key in state.attrs) {
        attrs[camelCaseAttributes.has(key) ? key : camelToDash(key)] =
            state.attrs[key]
    }
    const initialStyle = { ...state.style }

    return (props: MotionProps) => {
        let style: ResolvedValues = initialStyle

        if (props.style) {
            const rawStyles = {}
            copyRawValuesOnly(rawStyles, props.style as any, props)
            style = { ...rawStyles, ...initialStyle }
        }

        return { ...attrs, style: toSolidStyle(style) }
    }
}
