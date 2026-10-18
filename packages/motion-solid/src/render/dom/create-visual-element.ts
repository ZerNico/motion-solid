import { HTMLVisualElement, SVGVisualElement } from "motion-dom"
import type { CreateVisualElement, VisualElementOptions } from "../types"
import { isSVGComponent } from "./utils/is-svg-component"

export const createDomVisualElement: CreateVisualElement = (
    Component,
    options: VisualElementOptions<HTMLElement | SVGElement>
) => {
    /**
     * Use explicit isSVG override if provided, otherwise auto-detect
     */
    const isSVG = options.isSVG ?? isSVGComponent(Component)

    /**
     * Port note: upstream disables projection for `motion.create(Fragment)`. Solid has no
     * fragment component.
     */
    return isSVG
        ? new SVGVisualElement(options)
        : new HTMLVisualElement(options)
}
