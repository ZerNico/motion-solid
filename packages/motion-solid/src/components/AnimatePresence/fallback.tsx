import type { JSX } from "@solidjs/web"
import { isHTMLElement } from "motion-dom"
import {
    createEffect,
    createMemo,
    createSignal,
    flatten,
    onCleanup,
    untrack,
} from "solid-js"
import type {
    PresenceFallback,
    PresenceMember,
} from "../../context/PresenceContext"
import { createLayoutTrigger } from "../../projection/layout-commit"
import { popChild, type PoppedChild } from "./PopChild"
import type { PresenceBoundary, PresenceParticipant } from "./PresenceChild"

type Child = Node | string | number

interface Exit {
    id: string
    isComplete: boolean
}

let exitId = 0

/**
 * Port note: Solid-only. Exits for children rendered by Solid's own `<Show>`/`<For>` directly
 * inside an `AnimatePresence` (use motion-solid's `Show`/`For` for exact upstream behaviour).
 *
 * Solid disposes such a child as soon as it's removed. Its `motion` components hand their
 * element over (`release`) instead of unmounting, and keep animating without an owner, while the
 * removed node stays in the document until they're done. Limits: a child that comes back is a new
 * instance (the old one finishes exiting), and its reactive content and cleanups don't run while
 * it exits.
 */
export function createPresenceFallback(boundary: PresenceBoundary) {
    const members = new Map<Element, PresenceMember>()
    const released = new Map<Element, VoidFunction>()
    const connectWaiters = new Map<Element, VoidFunction>()

    /**
     * Exiting children (top-level nodes), by the exit in progress.
     */
    const exits = new Map<Child, Exit>()
    const popped = new Map<Child, PoppedChild>()
    let isDisposed = false

    const contains = (child: Child, element: Element) =>
        child === element || (child instanceof Node && child.contains(element))

    const isInExitingChild = (element: Element) => {
        for (const [child, exit] of exits) {
            if (!exit.isComplete && contains(child, element)) return true
        }
        return false
    }

    const hasMembers = (child: Child) => {
        for (const element of members.keys()) {
            if (contains(child, element)) return true
        }
        return false
    }

    const forEachMember = (
        child: Child,
        callback: (member: PresenceMember) => void
    ) => {
        members.forEach((member, element) => {
            if (contains(child, element)) callback(member)
        })
    }

    const finishReleased = (child?: Child) => {
        released.forEach((finish, element) => {
            if (child !== undefined && !contains(child, element)) return
            released.delete(element)
            finish()
        })
    }

    const fallback: PresenceFallback = {
        register(element, member) {
            members.set(element, member)
            return () => {
                if (members.get(element) === member) members.delete(element)
            }
        },
        release(element, finish) {
            connectWaiters.delete(element)
            if (isDisposed) return finish()

            released.set(element, finish)

            /**
             * Wait for this flush to diff the children: if the element belongs to an exiting
             * child it finishes with it, otherwise it was removed from inside a child that's
             * still present.
             */
            queueMicrotask(() => {
                if (released.get(element) !== finish) return
                if (isInExitingChild(element)) return
                released.delete(element)
                finish()
            })
        },
        whenConnected(element, callback) {
            connectWaiters.set(element, callback)
            return () => {
                if (connectWaiters.get(element) === callback) {
                    connectWaiters.delete(element)
                }
            }
        },
    }

    const List = (props: { children?: JSX.Element }) => {
        /**
         * Solid's `children()`, except that it tells the boundary which computation reads the
         * children directly (the presence-aware `Show`/`For` it reads join it).
         */
        const unresolved = createMemo(() => props.children, {
            lazy: true,
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.PresenceFallback.children"
                    : undefined,
        })
        const resolved = createMemo(
            () => {
                boundary.setDirectReader()
                return flatten(unresolved()) as unknown
            },
            {
                lazy: true,
                sync: true,
                name:
                    process.env.NODE_ENV !== "production"
                        ? "Motion.PresenceFallback.resolved"
                        : undefined,
            }
        )
        const [version, setVersion] = createSignal(0, {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.PresenceFallback.version"
                    : undefined,
        })
        /**
         * Bumped when an exit starts, for the other participants.
         */
        const [exitsVersion, setExitsVersion] = createSignal(0, {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.PresenceFallback.exitsVersion"
                    : undefined,
        })

        const participant: PresenceParticipant = {
            hasPendingExits: () => {
                exitsVersion()
                version()
                for (const exit of exits.values()) {
                    if (!exit.isComplete) return true
                }
                return false
            },
            /**
             * Its children include the nodes of presence-aware `Show`/`For`, counted by them.
             */
            renderedCount: () =>
                committed.filter((child) => !boundary.ownsNode(child)).length,
        }
        boundary.addParticipant(participant)

        /**
         * The children as last written to the DOM.
         */
        let committed: Child[] = []

        const present = createMemo(
            () => {
                const value = resolved()
                return (Array.isArray(value) ? value : [value]).filter(
                    (child): child is Child =>
                        child !== null &&
                        child !== undefined &&
                        typeof child !== "boolean"
                ) as Child[]
            },
            {
                name:
                    process.env.NODE_ENV !== "production"
                        ? "Motion.PresenceFallback.present"
                        : undefined,
            }
        )

        /**
         * Pure: from the committed children and the present ones. Exit state only changes once
         * a diff commits (below), an exit completes (`version`), or the exits of the boundary's
         * other participants do.
         */
        const rendered = createMemo(
            () => {
                version()
                const presentChildren = present()

                let nextChildren = [...presentChildren]
                const exitingChildren: Child[] = []
                let insertionIndex = 0

                for (const child of committed) {
                    const presentIndex = presentChildren.indexOf(child)

                    if (presentIndex === -1) {
                        const isLeaving = exits.has(child) || hasMembers(child)
                        if (!isLeaving) continue
                        nextChildren.splice(insertionIndex++, 0, child)
                        exitingChildren.push(child)
                    } else {
                        insertionIndex =
                            presentIndex + exitingChildren.length + 1
                    }
                }

                /**
                 * Like upstream, exiting children are removed all at once, when every exit of the
                 * boundary is done.
                 *
                 * Port note: in `"wait"` mode, only this fallback's own exits hold its entering
                 * children back (its children include the nodes of presence-aware `Show`/`For`, which
                 * it can't tell apart).
                 */
                const isEveryExitComplete =
                    exitingChildren.every(
                        (child) => exits.get(child)?.isComplete
                    ) && !boundary.hasPendingExits(participant)

                if (isEveryExitComplete) {
                    nextChildren = presentChildren
                } else if (
                    boundary.props.mode === "wait" &&
                    exitingChildren.some(
                        (child) => !exits.get(child)?.isComplete
                    )
                ) {
                    nextChildren = exitingChildren
                }

                return nextChildren
            },
            {
                name:
                    process.env.NODE_ENV !== "production"
                        ? "Motion.PresenceFallback.rendered"
                        : undefined,
            }
        )

        createLayoutTrigger(
            rendered,
            (next) => {
                const presentChildren = untrack(present)

                /**
                 * Port note: upstream re-renders the siblings of children that enter or exit
                 * (`presenceAffectsLayout`).
                 */
                if (boundary.props.presenceAffectsLayout !== false) {
                    boundary.scope.snapshot()
                    boundary.layoutGroup.group?.dirty()
                }

                // Measure children that pop out of the layout, while they're still in it.
                if (boundary.props.mode !== "popLayout") return
                for (const child of next) {
                    if (
                        !presentChildren.includes(child) &&
                        !exits.has(child) &&
                        isHTMLElement(child)
                    ) {
                        popped.set(child, popChild(child as HTMLElement))
                    }
                }
            },
            (next) => {
                const presentChildren = untrack(present)

                for (const child of next) {
                    if (presentChildren.includes(child) || exits.has(child)) {
                        continue
                    }
                    startExit(child)
                }

                for (const child of presentChildren) {
                    if (exits.has(child)) enter(child)
                }

                for (const child of committed) {
                    if (
                        !next.includes(child) &&
                        !presentChildren.includes(child)
                    ) {
                        remove(child)
                    }
                }

                committed = next
                boundary.participantCommitted()
            },
            {
                name:
                    process.env.NODE_ENV !== "production"
                        ? "Motion.PresenceFallback.layout"
                        : undefined,
            }
        )

        const startExit = (child: Child) => {
            const exit: Exit = { id: `fallback-${exitId++}`, isComplete: false }
            exits.set(child, exit)
            boundary.exitStarted(exit.id)
            setExitsVersion((value) => value + 1)

            const { anchorX, anchorY, root } = boundary.props
            popped.get(child)?.pop({ anchorX, anchorY, root }, boundary.nonce)

            const exiting: Promise<void>[] = []
            forEachMember(child, (member) => exiting.push(member.exit()))

            Promise.all(exiting).then(() => {
                if (isDisposed || exits.get(child) !== exit) return
                exit.isComplete = true
                setVersion((value) => value + 1)
                boundary.exitCompleted(exit.id)
            })
        }

        const enter = (child: Child) => {
            const exit = exits.get(child)!
            exits.delete(child)
            boundary.exitCancelled(exit.id)
            popped.get(child)?.restore()
            popped.delete(child)
            forEachMember(child, (member) => member.enter())
        }

        const remove = (child: Child) => {
            exits.delete(child)
            popped.get(child)?.restore()
            popped.delete(child)
            finishReleased(child)
        }

        /**
         * Mount the components that waited for the document (`mode="wait"`).
         */
        createEffect(
            rendered,
            () => {
                connectWaiters.forEach((callback, element) => {
                    if (!element.isConnected) return
                    connectWaiters.delete(element)
                    callback()
                })
            },
            {
                name:
                    process.env.NODE_ENV !== "production"
                        ? "Motion.PresenceFallback.connect"
                        : undefined,
            }
        )

        return rendered as unknown as JSX.Element
    }

    const dispose = () => {
        isDisposed = true
        exits.forEach((exit) => boundary.exitCancelled(exit.id))
        exits.clear()
        popped.forEach((child) => child.restore())
        popped.clear()
        connectWaiters.clear()
        finishReleased()
        members.clear()
    }

    onCleanup(dispose)

    return { fallback, List }
}
