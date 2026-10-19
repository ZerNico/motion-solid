import type { JSX } from "@solidjs/web"
import { invariant } from "motion-utils"
import { createEffect, createSignal, omit, untrack } from "solid-js"
import { ReorderContext } from "../../context/ReorderContext"
import { motion } from "../../render/components/motion/proxy"
import type { HTMLMotionProps } from "../../render/dom/types"
import type {
    DefaultGroupElement,
    ItemData,
    ReorderAxis,
    ReorderContextProps,
    ReorderElementTag,
} from "./types"
import { checkReorder } from "./utils/check-reorder"
import { detectAxis } from "./utils/detect-axis"

export interface Props<
    V,
    TagName extends ReorderElementTag = DefaultGroupElement
> {
    /**
     * A HTML element to render this component as. Defaults to `"ul"`.
     *
     * @public
     */
    as?: TagName

    /**
     * The axis to reorder along. By default, items will be draggable on this axis.
     * To make draggable on both axes, set `<Reorder.Item drag />`
     *
     * @public
     */
    axis?: ReorderAxis

    /**
     * A callback to fire with the new value order. For instance, if the values
     * are provided as a signal, this can be its setter.
     *
     * ```jsx
     * const [items, setItems] = createSignal([0, 1])
     *
     * <Reorder.Group values={items()} onReorder={setItems}>
     *   <For each={items()}>
     *     {(item) => <Reorder.Item value={item}>{item}</Reorder.Item>}
     *   </For>
     * </Reorder.Group>
     * ```
     *
     * @public
     */
    onReorder: (newOrder: V[]) => void

    /**
     * The latest values state.
     *
     * @public
     */
    values: V[]
}

type ReorderGroupProps<
    V,
    TagName extends ReorderElementTag = DefaultGroupElement
> = Props<V, TagName> &
    Omit<HTMLMotionProps<TagName>, "values"> & {
        children?: JSX.Element
        ref?: (element: Element) => void
    }

/**
 * Port note: the same component as upstream. `as` is read once.
 */
export function ReorderGroup<
    Values extends any[],
    TagName extends ReorderElementTag = DefaultGroupElement
>(
    props: Omit<
        ReorderGroupProps<Values[number], TagName>,
        "values" | "onReorder"
    > & {
        values: Values
        onReorder: (newOrder: Values) => void
    }
): JSX.Element {
    type V = Values[number]

    const Component = (motion as any)[untrack(() => props.as) ?? "ul"]

    const itemLayouts = new Map<V, ItemData<V>["layout"]>()
    const [detectedAxis, setDetectedAxis] = createSignal<ReorderAxis>("y", {
        name:
            process.env.NODE_ENV !== "production"
                ? "Motion.Reorder.Group.axis"
                : undefined,
    })
    let isReordering = false
    const groupRef: { current: Element | null } = { current: null }

    const axis = () => props.axis || detectedAxis()

    invariant(
        Boolean(untrack(() => props.values)),
        "Reorder.Group must be provided a values prop",
        "reorder-values"
    )

    /**
     * Forget the layouts of values that were removed.
     *
     * Port note: upstream runs this after every render. The compute reads every item, so it also
     * re-runs when `values` is a store array that's changed in place (same array).
     */
    createEffect(
        () => [...props.values],
        (values) => {
            const valuesSet = new Set(values)
            itemLayouts.forEach((_, value) => {
                if (!valuesSet.has(value)) itemLayouts.delete(value)
            })
            isReordering = false
        },
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.Reorder.Group.values"
                    : undefined,
        }
    )

    const context: ReorderContextProps<V> = {
        get axis() {
            return axis()
        },
        groupRef,
        registerItem: (value, layout) => {
            itemLayouts.set(value, layout)

            if (!untrack(() => props.axis)) {
                const nextAxis = detectAxis(
                    untrack(() => props.values).flatMap((itemValue: V) => {
                        const itemLayout = itemLayouts.get(itemValue)
                        return itemLayout ? [itemLayout] : []
                    })
                )

                if (nextAxis !== untrack(detectedAxis)) {
                    setDetectedAxis(nextAxis)
                }
            }
        },
        updateOrder: (item, offset, velocity) => {
            /**
             * If we've already reordered and the values haven't updated yet,
             * ignore further reorder attempts to prevent flickering.
             */
            if (isReordering) return

            const values = untrack(() => props.values)
            const order = values.flatMap((value: V) => {
                const layout = itemLayouts.get(value)
                return layout ? [{ value, layout }] : []
            })

            const direction =
                groupRef.current?.ownerDocument.defaultView?.getComputedStyle(
                    groupRef.current
                ).direction === "rtl"
                    ? "rtl"
                    : "ltr"

            const newOrder = checkReorder(
                order,
                item,
                offset,
                velocity,
                untrack(axis),
                direction
            )

            if (order !== newOrder) {
                isReordering = true
                const newValues = [...values] as Values
                const measuredIndexes = order.map(({ value }) =>
                    values.indexOf(value)
                )
                newOrder.forEach(({ value }, index) => {
                    newValues[measuredIndexes[index]] = value
                })
                props.onReorder(newValues)
            }
        },
    }

    const rest = omit(
        props as any,
        "as",
        "axis",
        "onReorder",
        "values",
        "children",
        "style",
        "ref"
    )

    const setRef = (element: Element) => {
        groupRef.current = element
        ;(props as { ref?: (element: Element) => void }).ref?.(element)
    }

    return (
        <Component
            {...rest}
            style={{ overflowAnchor: "none", ...(props as any).style }}
            ref={setRef}
            ignoreStrict
        >
            <ReorderContext value={context}>{props.children}</ReorderContext>
        </Component>
    )
}
