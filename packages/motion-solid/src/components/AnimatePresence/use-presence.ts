import { createUniqueId, onCleanup, useContext, type Accessor } from "solid-js"
import {
    PresenceContext,
    type PresenceContextProps,
} from "../../context/PresenceContext"

export type SafeToRemove = () => void

/**
 * When a component is the child of `AnimatePresence`, it can use `usePresence`
 * to access information about whether it's still present in the tree.
 *
 * ```jsx
 * import { usePresence } from "@motion-s/solid"
 *
 * export const Component = () => {
 *   const [isPresent, safeToRemove] = usePresence()
 *
 *   createEffect(isPresent, (present) => {
 *     if (!present) setTimeout(safeToRemove, 1000)
 *   })
 *
 *   return <div />
 * }
 * ```
 *
 * If `isPresent()` is `false`, it means that a component has been removed from the tree,
 * but `AnimatePresence` won't really remove it until `safeToRemove` has been called.
 *
 * Port note: `isPresent` is an accessor, and `safeToRemove` is always returned (calling it while
 * present does nothing). Exits only wait for it when the component is rendered by motion-solid's
 * presence-aware `Show`/`For`.
 *
 * @public
 */
export function usePresence(
    subscribe: boolean = true
): [Accessor<boolean>, SafeToRemove | null] {
    const context = useContext(PresenceContext)

    if (context === null) return [() => true, null]

    const id = createUniqueId()
    if (subscribe) onCleanup(context.register(id))

    const safeToRemove = () => {
        subscribe && context.onExitComplete(id)
    }

    return [context.isPresent, safeToRemove]
}

/**
 * Similar to `usePresence`, except `useIsPresent` simply returns whether or not the component is present.
 * There is no `safeToRemove` function.
 *
 * @public
 */
export function useIsPresent(): Accessor<boolean> {
    const context = useContext(PresenceContext)
    return () => isPresent(context)
}

export function isPresent(context: PresenceContextProps | null) {
    return context === null ? true : context.isPresent()
}

/**
 * The `custom` data of the closest `AnimatePresence`.
 *
 * @public
 */
export function usePresenceData(): Accessor<any> {
    const context = useContext(PresenceContext)
    return () => (context ? context.custom() : undefined)
}
