import type { JSX } from "@solidjs/web"
import type { MotionValue } from "motion-dom"
import type { Component } from "solid-js"
import type { MotionComponentBaseProps, MotionProps } from "../../motion/types"

type AttributesWithoutMotionProps<Attributes> = {
    [K in Exclude<keyof Attributes, keyof MotionProps>]?: Attributes[K]
}

/**
 * Props of a `motion` element: the element's own props, without the ones Motion replaces.
 *
 * @public
 */
export type HTMLMotionProps<TagName extends keyof JSX.IntrinsicElements> =
    AttributesWithoutMotionProps<JSX.IntrinsicElements[TagName]> &
        MotionComponentBaseProps

type NotAnimatableAttribute = `on${string}` | "ref" | "children" | "class"

/**
 * SVG attributes (`cx`, `fill`, ...) can be motion values, like upstream.
 *
 * @public
 */
export type SVGAttributesAsMotionValues<Attributes> = {
    [K in keyof Attributes]: K extends NotAnimatableAttribute
        ? Attributes[K]
        : Attributes[K] | MotionValue<number> | MotionValue<string>
}

/**
 * Props of a `motion` SVG element.
 *
 * @public
 */
export type SVGMotionProps<TagName extends keyof JSX.SVGElementTags> =
    SVGAttributesAsMotionValues<
        AttributesWithoutMotionProps<JSX.SVGElementTags[TagName]>
    > &
        MotionComponentBaseProps

/**
 * Motion-optimised versions of the DOM elements.
 *
 * @public
 */
export type DOMMotionComponents = {
    [TagName in keyof JSX.IntrinsicElements]: Component<
        TagName extends keyof JSX.SVGElementTags
            ? SVGMotionProps<TagName>
            : HTMLMotionProps<TagName>
    >
}
