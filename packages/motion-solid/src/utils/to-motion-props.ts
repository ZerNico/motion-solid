import { omit } from "solid-js"

/**
 * The props that DOM elements and `motion` components both have, with a different meaning: DOM
 * event handlers on an element, Motion's `onAnimationStart(definition)` and
 * `onDrag*(event, info)` callbacks on a `motion` component.
 */
const domConflicts = [
    "onAnimationStart",
    "onDrag",
    "onDragStart",
    "onDragEnd",
] as const

export type MotionDOMConflict = (typeof domConflicts)[number]

/**
 * Port note: Solid-only. Props meant for a DOM element, for a `motion` component: without the
 * DOM event handlers whose names Motion uses for its own callbacks. Upstream passes elements
 * (`render={<motion.button />}`), which libraries merge their props into. Solid can't clone
 * elements, so headless libraries hand you their props to spread
 * (`render={(props) => <motion.button {...toMotionProps(props)} />}`).
 *
 * The props stay reactive (Solid's `omit`).
 */
export function toMotionProps<T extends object>(
    props: T
): Omit<T, MotionDOMConflict> {
    return omit(props as Record<string, unknown>, ...domConflicts) as Omit<
        T,
        MotionDOMConflict
    >
}
