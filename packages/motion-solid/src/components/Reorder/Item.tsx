import type { JSX } from "@solidjs/web"
import { isMotionValue, type MotionValue } from "motion-dom"
import { invariant } from "motion-utils"
import { omit, onCleanup, untrack, useContext } from "solid-js"
import { ReorderContext } from "../../context/ReorderContext"
import { motion } from "../../render/components/motion/proxy"
import type { HTMLMotionProps } from "../../render/dom/types"
import { useMotionValue } from "../../value/use-motion-value"
import { useTransform } from "../../value/use-transform"
import type { DefaultItemElement, ReorderElementTag } from "./types"
import { autoScrollIfNeeded, resetAutoScrollState } from "./utils/auto-scroll"

export interface Props<
    V,
    TagName extends ReorderElementTag = DefaultItemElement,
> {
    /**
     * A HTML element to render this component as. Defaults to `"li"`.
     *
     * @public
     */
    as?: TagName

    /**
     * The value in the list that this component represents.
     *
     * @public
     */
    value: V

    /**
     * A subset of layout options primarily used to disable layout="size"
     *
     * @public
     * @default true
     */
    layout?: true | "position"
}

/**
 * The item whose drag set the auto-scroll state last.
 */
let autoScrollingItem: object | undefined

function useDefaultMotionValue(value: any, defaultValue: number = 0) {
    return isMotionValue(value)
        ? (value as MotionValue<number>)
        : useMotionValue(defaultValue)
}

type ReorderItemProps<
    V,
    TagName extends ReorderElementTag = DefaultItemElement,
> = Props<V, TagName> &
    Omit<HTMLMotionProps<TagName>, "value" | "layout"> & {
        children?: JSX.Element
    }

/**
 * Port note: the same component as upstream. `as` and the `x`/`y` motion values of `style` are
 * read once.
 */
export function ReorderItem<
    V,
    TagName extends ReorderElementTag = DefaultItemElement,
>(props: ReorderItemProps<V, TagName>): JSX.Element {
    const Component = (motion as any)[untrack(() => props.as) ?? "li"]

    const context = useContext(ReorderContext)

    const initialStyle = untrack(() => (props as any).style) ?? {}
    const point = {
        x: useDefaultMotionValue(initialStyle.x),
        y: useDefaultMotionValue(initialStyle.y),
    }

    const zIndex = useTransform([point.x, point.y], ([latestX, latestY]) =>
        latestX || latestY ? 1 : "unset"
    )

    invariant(
        Boolean(context),
        "Reorder.Item must be a child of Reorder.Group",
        "reorder-item-child"
    )

    const { registerItem, updateOrder, groupRef } = context!

    /**
     * Port note: a drag ends without `onDragEnd` when its component is disposed (see
     * `gestures/drag`), e.g. its group is removed mid-drag. The auto-scroll state is reset then
     * too, while the group is still in the document (to find its scroller), if this item's drag
     * is the latest (a drag cancelled with `dragControls` doesn't end with `onDragEnd` either,
     * and another item's drag may have started since).
     */
    const item = {}
    onCleanup(() => {
        if (autoScrollingItem !== item) return
        autoScrollingItem = undefined
        resetAutoScrollState()
    })

    const rest = omit(
        props as any,
        "as",
        "value",
        "layout",
        "style",
        "onDrag",
        "onDragEnd",
        "children"
    )

    return (
        <Component
            drag={context!.axis === "xy" ? true : context!.axis}
            {...rest}
            dragSnapToOrigin
            style={{
                ...(props as any).style,
                x: point.x,
                y: point.y,
                zIndex,
            }}
            layout={props.layout ?? true}
            onDrag={(event: PointerEvent, gesturePoint: any) => {
                autoScrollingItem = item
                const { velocity, point: pointerPoint } = gesturePoint
                const offset = { x: point.x.get(), y: point.y.get() }

                // Always attempt to update order - checkReorder handles the logic
                updateOrder(props.value, offset, velocity)

                const axis = context!.axis
                const scrollAxis =
                    axis === "xy"
                        ? Math.abs(velocity.x) > Math.abs(velocity.y)
                            ? "x"
                            : "y"
                        : axis
                autoScrollIfNeeded(
                    groupRef.current,
                    pointerPoint[scrollAxis],
                    scrollAxis,
                    velocity[scrollAxis]
                )
                ;(props as any).onDrag?.(event, gesturePoint)
            }}
            onDragEnd={(event: PointerEvent, gesturePoint: any) => {
                if (autoScrollingItem === item) autoScrollingItem = undefined
                resetAutoScrollState()
                ;(props as any).onDragEnd?.(event, gesturePoint)
            }}
            onLayoutMeasure={(measured: any) => {
                registerItem(
                    untrack(() => props.value),
                    measured
                )
            }}
            ignoreStrict
        >
            {props.children}
        </Component>
    )
}
