import type { JSX } from "@solidjs/web"
import { createMemo, onCleanup, onSettled, untrack, useContext } from "solid-js"
import { LayoutGroupContext } from "../../context/LayoutGroupContext"
import { MotionConfigContext } from "../../context/MotionConfigContext"
import {
    PresenceContext,
    type PresenceContextProps,
} from "../../context/PresenceContext"
import { createLayoutTrigger } from "../../projection/layout-commit"
import {
    LayoutScope,
    LayoutScopeContext,
    useLayoutScope,
} from "../../projection/layout-scope"
import { createPresenceFallback } from "./fallback"
import {
    createPresenceBoundary,
    createPresenceChild,
    PresenceBoundaryContext,
} from "./PresenceChild"
import type { AnimatePresenceProps } from "./types"

/**
 * `AnimatePresence` enables the animation of components that have been removed from the tree.
 *
 * Any `motion` components that have an `exit` property defined will animate out when removed from
 * the tree.
 *
 * ```jsx
 * import { AnimatePresence, For, motion } from "@motion-s/solid"
 *
 * export const Items = (props) => (
 *   <AnimatePresence>
 *     <For each={props.items}>
 *       {(item) => (
 *         <motion.div
 *           initial={{ opacity: 0 }}
 *           animate={{ opacity: 1 }}
 *           exit={{ opacity: 0 }}
 *         />
 *       )}
 *     </For>
 *   </AnimatePresence>
 * )
 * ```
 *
 * You can sequence exit animations throughout a tree using variants.
 *
 * If a child contains multiple `motion` components with `exit` props, it will only unmount the child
 * once all `motion` components have finished animating out. Likewise, any components using
 * `usePresence` all need to call `safeToRemove`.
 *
 * Port note: upstream tracks its children by React `key`, and keeps rendering a removed child
 * until it has exited. Solid's control flow disposes a removed child right away, so children are
 * removed through motion-solid's presence-aware `Show` and `For` (same props as Solid's), which
 * keep the child until its exit is done. Like upstream, only its direct children: a `Show`/`For`
 * inside an element, a context provider or another child is Solid's own (see `control-flow.tsx`).
 * Solid's own `<Show>`/`<For>` directly inside still exit, through a fallback with some limits
 * (see `fallback.tsx`).
 *
 * @public
 */
export function AnimatePresence(props: AnimatePresenceProps) {
    const { nonce } = useContext(MotionConfigContext)
    const layoutGroup = useContext(LayoutGroupContext)
    const parentPresence = useContext(PresenceContext)
    const scope = new LayoutScope(useLayoutScope())

    /**
     * If `initial={false}` we only want to pass this to components in the first render.
     */
    let isInitialRender = true
    onSettled(() => {
        isInitialRender = false
    })

    /**
     * With `propagate`, this boundary's children exit when the parent presence's child does.
     */
    const propagate = untrack(() => props.propagate) === true
    const parent = propagate ? parentPresence : null
    const isPresent = createMemo(() => (parent ? parent.isPresent() : true))

    const boundary = createPresenceBoundary({
        props,
        isPresent,
        isInitialRender: () => isInitialRender,
        nonce,
        layoutGroup,
        scope,
    })

    /**
     * The presence of the children that aren't rendered by presence-aware control flow: they
     * exit only when propagating.
     */
    const rootPresence: PresenceContextProps = createPresenceChild(
        boundary,
        isPresent,
        () => {},
        undefined,
        parent
    )

    const { fallback, List } = createPresenceFallback(boundary)
    rootPresence.fallback = fallback

    onCleanup(() => scope.dispose())

    /**
     * Port note: upstream re-renders the children when the parent presence changes, which
     * snapshots their layout.
     */
    createLayoutTrigger(isPresent, () => scope.snapshot())

    return (
        <PresenceBoundaryContext value={boundary}>
            <LayoutScopeContext value={scope}>
                <PresenceContext value={rootPresence}>
                    <List>{props.children as JSX.Element}</List>
                </PresenceContext>
            </LayoutScopeContext>
        </PresenceBoundaryContext>
    )
}
