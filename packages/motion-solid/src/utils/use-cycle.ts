import { wrap } from "motion-utils"
import { createSignal, type Accessor } from "solid-js"

export type Cycle = (i?: number) => void

export type CycleState<T> = [Accessor<T>, Cycle]

/**
 * Cycles through a series of visual properties. Can be used to toggle between or cycle through
 * animations. It works similar to `createSignal`, but the setter cycles through the items given
 * to it (or jumps to an index).
 *
 * ```jsx
 * const [x, cycleX] = useCycle(0, 50, 100)
 *
 * return <motion.div animate={{ x: x() }} onTap={() => cycleX()} />
 * ```
 *
 * Port note: the current item is an accessor.
 *
 * @public
 */
export function useCycle<T>(...items: T[]): CycleState<T> {
    let index = 0
    // Boxed, as items can be functions.
    const [current, setCurrent] = createSignal(
        { item: items[index] },
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.useCycle.current"
                    : undefined,
        }
    )

    const runCycle = (next?: number) => {
        index =
            typeof next !== "number" ? wrap(0, items.length, index + 1) : next
        setCurrent({ item: items[index] })
    }

    return [() => current().item, runCycle]
}
