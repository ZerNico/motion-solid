import type { VariantLabels } from "motion-dom"
import { createContext, type Accessor } from "solid-js"

/**
 * The presence of one child of an `AnimatePresence` (upstream: `PresenceChild`'s context value).
 *
 * Port note: `isPresent` and `custom` are reactive (upstream re-renders the child with a new
 * context value). `register`/`onExitComplete` work like upstream: everything that has to finish
 * before the child is removed registers an id, and reports it once done.
 */
export interface PresenceContextProps {
    id: string
    isPresent: Accessor<boolean>
    /**
     * `false` for children rendered by `AnimatePresence`'s first render with `initial={false}`.
     */
    initial: false | VariantLabels | undefined
    custom: Accessor<any>
    register: (id: string | number) => VoidFunction
    onExitComplete: (id: string | number) => void
    /**
     * Port note: Solid-only. For motion components rendered by Solid's own `<Show>`/`<For>`
     * directly inside `AnimatePresence`, which dispose them as soon as they're removed (see
     * `components/AnimatePresence/fallback.tsx`).
     */
    fallback?: PresenceFallback
}

/**
 * Port note: Solid-only. Exits for children rendered by Solid's own control flow, which disposes
 * them when they're removed: their `motion` components hand over their element instead of
 * unmounting, and keep animating without an owner until the exit is done.
 */
export interface PresenceFallback {
    register: (element: Element, member: PresenceMember) => VoidFunction
    release: (element: Element, finish: VoidFunction) => void
    /**
     * Runs `callback` once `element` is in the document (`mode="wait"` holds entering children
     * back), returns a function that cancels it.
     */
    whenConnected: (element: Element, callback: VoidFunction) => VoidFunction
}

export interface PresenceMember {
    /**
     * Starts the exit. Resolves once the member is safe to remove.
     */
    exit: () => Promise<void>
    /**
     * Re-enters after `exit()`.
     */
    enter: () => void
}

/**
 * @public
 */
export const PresenceContext =
    /* @__PURE__ */ createContext<PresenceContextProps | null>(null)
