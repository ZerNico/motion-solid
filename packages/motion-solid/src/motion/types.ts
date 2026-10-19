import type {
    AnyResolvedKeyframe,
    MotionNodeOptions,
    MotionValue,
} from "motion-dom"
import type * as CSS from "csstype"
import type { JSX } from "@solidjs/web"

/**
 * Either a string, or array of strings, that reference variants defined via the `variants` prop.
 * @public
 */
export type VariantLabels = string | string[]

import type { SVGPathProperties, TransformProperties } from "motion-dom"
export type { SVGPathProperties, TransformProperties }

export type MotionValueString = MotionValue<string>
export type MotionValueNumber = MotionValue<number>
export type MotionValueAny = MotionValue<any>
export type AnyMotionValue =
    | MotionValueNumber
    | MotionValueString
    | MotionValueAny

type MotionValueHelper<T> = T | AnyMotionValue
type MakeMotionHelper<T> = {
    [K in keyof T]: MotionValueHelper<T[K]>
}

type MakeCustomValueTypeHelper<T> = MakeMotionHelper<T>
export type MakeMotion<T> = MakeCustomValueTypeHelper<T>

/**
 * Port note: based on `csstype`'s camelCase properties (React's `CSSProperties` is too). Motion
 * values use camelCase keys like upstream (`backgroundColor`, `x`), and kebab-case keys
 * (`"background-color"`) are accepted too, like Solid's own `style` prop.
 */
export type MotionCSS = MakeMotion<
    Omit<
        CSS.Properties<string | number>,
        "rotate" | "scale" | "perspective" | "x" | "y" | "z"
    >
> &
    MakeMotion<
        Omit<
            CSS.PropertiesHyphen<string | number>,
            "rotate" | "scale" | "perspective" | "x" | "y" | "z"
        >
    >

/**
 * @public
 */
export type MotionTransform = MakeMotion<TransformProperties>

type MotionCSSVariable =
    | MotionValueNumber
    | MotionValueString
    | AnyResolvedKeyframe
    | undefined

/**
 * @public
 */
export interface MotionCSSVariables {
    [key: `--${string}`]: MotionCSSVariable
}

type MotionSVGProps = MakeMotion<SVGPathProperties>

/**
 * @public
 */
export interface MotionStyle
    extends MotionCSS, MotionTransform, MotionSVGProps, MotionCSSVariables {}

/**
 * Props for `motion` components.
 *
 * @public
 */
export interface MotionProps extends MotionNodeOptions {
    /**
     *
     * The `style` prop, enhanced with support for `MotionValue`s and separate `transform` values.
     *
     * ```jsx
     * export const MyComponent = () => {
     *   const x = useMotionValue(0)
     *
     *   return <motion.div style={{ x, opacity: 1, scale: 0.5 }} />
     * }
     * ```
     *
     * Port note: also takes what Solid's `style` takes, CSS property names
     * (`"background-color"`), a string (`"color: red"`) and `false`/`null` for none, so a
     * `style` meant for a DOM element can be passed on.
     */
    style?: MotionStyle | JSX.HTMLAttributes<HTMLElement>["style"]

    children?: JSX.Element | MotionValueNumber | MotionValueString
}

/**
 * The props of `motion` components (what users pass). Port note: `dragConstraints` also takes the
 * constraining element, or an accessor of it (e.g. a signal set by its `ref`), instead of a React
 * ref object (still accepted). The component turns them into `MotionProps`.
 */
export type MotionComponentBaseProps = Omit<MotionProps, "dragConstraints"> & {
    /**
     * An object of optional `top`, `left`, `right`, `bottom` pixel values,
     * beyond which dragging is constrained.
     *
     * Another component can be used as drag constraints: pass its element, or an accessor of it.
     */
    dragConstraints?:
        | MotionProps["dragConstraints"]
        | Element
        | (() => Element | null | undefined)
}
