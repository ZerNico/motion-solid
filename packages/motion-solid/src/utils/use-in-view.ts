import { createEffect, createSignal, untrack, type Accessor } from "solid-js"
import { inView, type InViewOptions } from "../render/dom/viewport"
import { access, readOptions, type MaybeAccessor } from "./access"
import { resolveRef, type ElementRef } from "./refs"

export interface UseInViewOptions
    extends Omit<InViewOptions, "root" | "amount"> {
    root?: ElementRef<Element>
    once?: boolean
    amount?: "some" | "all" | number
    initial?: boolean
}

/**
 * Whether `ref`'s element is in the viewport.
 *
 * ```jsx
 * let element!: HTMLDivElement
 * const isInView = useInView(() => element)
 *
 * return <div ref={element}>{isInView() ? "In view" : "Not in view"}</div>
 * ```
 *
 * Port note: takes an element, an accessor of one or a `{ current }` object instead of a React
 * ref, and returns an accessor. The options are read lazily (an accessor, or an object with
 * getters): changing them observes again, except `initial`, read once.
 *
 * @public
 */
export function useInView(
    ref: ElementRef<Element>,
    options: MaybeAccessor<UseInViewOptions> = {}
): Accessor<boolean> {
    const [isInView, setInView] = createSignal(
        untrack(() => access(options)?.initial) ?? false,
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.useInView.isInView"
                    : undefined,
        }
    )

    /**
     * Port note: the refs are read in the compute (so accessors of signals are tracked) and read
     * again (untracked) in the apply, once the component's elements exist: a plain `let` ref or a
     * `{ current }` object isn't set yet when the compute first runs.
     */
    let previousElement: Element | undefined
    createEffect(
        () => {
            const {
                root,
                margin,
                amount,
                once = false,
            } = readOptions(options) ?? {}
            resolveRef(ref)
            resolveRef(root)
            return { root, margin, amount, once }
        },
        ({ root, margin, amount, once }) => {
            const element = untrack(() => resolveRef(ref))

            /**
             * Port note: a ref switching to another element (or none) is out of view until it
             * enters. Upstream keeps the previous element's state.
             */
            if (element !== previousElement) {
                if (previousElement && !(once && untrack(isInView))) {
                    setInView(false)
                }
                previousElement = element
            }

            if (!element || (once && untrack(isInView))) return

            const onEnter = () => {
                setInView(true)

                return once ? undefined : () => setInView(false)
            }

            return inView(element, onEnter, {
                root: untrack(() => resolveRef(root)),
                margin,
                amount,
            })
        },
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.useInView.observe"
                    : undefined,
        }
    )

    return isInView
}
