import { warnOnce } from "motion-utils"
import {
    createContext,
    createSignal,
    createUniqueId,
    getObserver,
    getOwner,
    isDisposed,
    onCleanup,
    untrack,
    useContext,
    type Accessor,
} from "solid-js"
import type { LayoutGroupContextProps } from "../../context/LayoutGroupContext"
import type { PresenceContextProps } from "../../context/PresenceContext"
import { createLayoutTrigger } from "../../projection/layout-commit"
import type { LayoutScope } from "../../projection/layout-scope"
import type { AnimatePresenceProps } from "./types"

/**
 * Port note: Solid-only. Something that renders children of an `AnimatePresence` and keeps them
 * while they exit: each presence-aware `Show`/`For` that joined it, and the fallback for Solid's
 * own control flow. Upstream has a single list of children; here each participant diffs its own,
 * and they coordinate through the boundary (`mode="wait"`, removing exited children together).
 */
export interface PresenceParticipant {
    /**
     * Whether some of its children are exiting and haven't completed. Reactive.
     */
    hasPendingExits: () => boolean
    /**
     * How many children it rendered in its latest commit (for upstream's `mode="wait"`
     * warning). Not reactive.
     */
    renderedCount: () => number
    /**
     * Whether a node is one of its children's (the fallback's children include them).
     */
    ownsNode?: (node: unknown) => boolean
}

/**
 * Port note: Solid-only. What the children of an `AnimatePresence` need from it: its props, and
 * bookkeeping of the exits in progress (for `onExitComplete` and `propagate`). Presence-aware
 * control flow (`Show`, `For`) renders its children through it.
 */
export interface PresenceBoundary {
    props: AnimatePresenceProps
    /**
     * `false` while a parent presence is exiting, with `propagate`.
     */
    isPresent: Accessor<boolean>
    /**
     * Whether the boundary is in its first render (`initial={false}` applies to these children).
     */
    isInitialRender: () => boolean
    nonce?: string
    layoutGroup: LayoutGroupContextProps
    scope: LayoutScope
    /**
     * Upstream's `exitComplete` map: `onExitComplete` is called when an exit completes and every
     * exit started since the last call has completed. An exit that's cancelled (the child comes
     * back, or is disposed) is forgotten, it never calls `onExitComplete`.
     */
    exitStarted: (id: string) => void
    exitCompleted: (id: string) => void
    exitCancelled: (id: string) => void
    /**
     * Joins the boundary's coordination, until the current owner is disposed.
     */
    addParticipant: (participant: PresenceParticipant) => void
    /**
     * Whether a participant other than `except` has exits pending. Reactive.
     */
    hasPendingExits: (except?: PresenceParticipant) => boolean
    /**
     * Whether the current computation is the boundary resolving its children (see
     * `control-flow.tsx`: only the `Show`/`For` it reads directly join it).
     */
    isDirectRead: () => boolean
    /**
     * Called by the boundary's children resolution, in its compute.
     */
    setDirectReader: () => void
    /**
     * Whether a node belongs to a participant that tells its own children apart.
     */
    ownsNode: (node: unknown) => boolean
    /**
     * Called when a participant commits what it renders.
     */
    participantCommitted: () => void
}

/**
 * Port note: Solid-only. The bookkeeping part of a `PresenceBoundary`.
 */
export function createPresenceBoundary(
    boundary: Omit<
        PresenceBoundary,
        | "exitStarted"
        | "exitCompleted"
        | "exitCancelled"
        | "addParticipant"
        | "hasPendingExits"
        | "isDirectRead"
        | "setDirectReader"
        | "ownsNode"
        | "participantCommitted"
    >
): PresenceBoundary {
    const exitComplete = new Map<string, boolean>()
    const participants = new Set<PresenceParticipant>()
    /**
     * Bumped when a participant leaves, so the others re-check `hasPendingExits`.
     */
    const [participantsVersion, setParticipantsVersion] = createSignal(0, {
        ownedWrite: true,
        name:
            process.env.NODE_ENV !== "production"
                ? "Motion.AnimatePresence.participantsVersion"
                : undefined,
    })
    let directReader: unknown
    let isWarningScheduled = false

    /**
     * Completions are reported a microtask late (see `createPresenceChild`): once the
     * `AnimatePresence` is disposed, its exits are cancelled.
     */
    let isBoundaryDisposed = false
    onCleanup(() => (isBoundaryDisposed = true))

    return {
        ...boundary,
        exitStarted: (id) => {
            exitComplete.set(id, false)
        },
        exitCompleted: (id) => {
            if (isBoundaryDisposed || !exitComplete.has(id)) return
            exitComplete.set(id, true)
            for (const isExitComplete of exitComplete.values()) {
                if (!isExitComplete) return
            }
            exitComplete.clear()
            untrack(() => boundary.props.onExitComplete)?.()
        },
        exitCancelled: (id) => {
            exitComplete.delete(id)
        },
        addParticipant: (participant) => {
            participants.add(participant)
            onCleanup(() => {
                participants.delete(participant)
                setParticipantsVersion((version) => version + 1)
            })
        },
        hasPendingExits: (except) => {
            participantsVersion()
            for (const participant of participants) {
                if (participant !== except && participant.hasPendingExits()) {
                    return true
                }
            }
            return false
        },
        isDirectRead: () =>
            directReader !== undefined && getObserver() === directReader,
        setDirectReader: () => {
            directReader = getObserver() ?? undefined
        },
        ownsNode: (node) => {
            for (const participant of participants) {
                if (participant.ownsNode?.(node)) return true
            }
            return false
        },
        /**
         * Port note: upstream warns when it renders several children in `"wait"` mode, from its
         * render. Here every participant renders some, so the total is checked once they've all
         * committed.
         */
        participantCommitted: () => {
            if (
                process.env.NODE_ENV === "production" ||
                isWarningScheduled ||
                untrack(() => boundary.props.mode) !== "wait"
            ) {
                return
            }
            isWarningScheduled = true
            queueMicrotask(() => {
                isWarningScheduled = false
                let renderedCount = 0
                for (const participant of participants) {
                    renderedCount += participant.renderedCount()
                }
                if (renderedCount > 1) {
                    warnOnce(
                        false,
                        `You're attempting to animate multiple children within AnimatePresence, but its mode is set to "wait". This will lead to odd visual behaviour.`
                    )
                }
            })
        },
    }
}

export const PresenceBoundaryContext =
    /* @__PURE__ */ createContext<PresenceBoundary | null>(null)

export const usePresenceBoundary = () => useContext(PresenceBoundaryContext)

/**
 * Port note: Solid-only. What a presence-aware list needs from its children's presence, besides
 * the context value.
 */
export interface PresenceChild extends PresenceContextProps {
    /**
     * Whether something has registered to finish before the child is removed. Without it, an exit
     * completes as soon as it starts, so the list counts it as complete when it diffs. Not
     * reactive: registrants register when they mount, before the child can exit.
     */
    hasRegistrants: () => boolean
    /**
     * Reports an exit that's complete without having started, for `onExitComplete`: the list
     * removed the child (nothing to wait for) in the update that removed it from its children,
     * so it's disposed before its exit would start.
     */
    exitedImmediately: VoidFunction
}

/**
 * The presence of one child of an `AnimatePresence`, upstream's `PresenceChild`.
 *
 * Everything that has to finish before the child is removed (exit animations, layout animations,
 * `usePresence`) registers an id and reports it with `onExitComplete`. Once the child stops being
 * present and every id has reported, `onComplete` is called.
 *
 * A child inside another presence child (nested presence-aware control flow, or
 * `AnimatePresence propagate`) is part of its parent: `isPresent` should include the parent's,
 * and the parent waits for this child's exit.
 *
 * Port note: upstream resets the registry in a memo when `isPresent` changes. Here that happens
 * when the change commits (layout trigger), before the descendants' snapshots report.
 */
export function createPresenceChild(
    boundary: PresenceBoundary,
    isPresent: Accessor<boolean>,
    onComplete: VoidFunction,
    onEnter?: VoidFunction,
    parent?: PresenceContextProps | null
): PresenceChild {
    const id = createUniqueId()
    const owner = getOwner()
    const registry = new Map<string | number, boolean>()
    const unregisterFromParent = parent?.register(id)
    let isExiting = false
    let isComplete = false
    /**
     * The current exit, so a completion reported late belongs to it.
     */
    let exit = 0

    const complete = () => {
        /**
         * Port note: a registrant also unregisters when this child is disposed (cleanups run
         * children first). A disposed child doesn't complete, its exit is cancelled.
         */
        if (!isExiting || isComplete || (owner && isDisposed(owner))) return
        for (const isRegistrantComplete of registry.values()) {
            if (!isRegistrantComplete) return
        }
        isComplete = true
        onComplete()
        parent?.onExitComplete(id)

        /**
         * Port note: upstream marks every exiting child in a layout effect before any of them can
         * complete (a child without exit animations completes in an effect). Here siblings start
         * their exits one by one as this flush applies: report the completion after the flush,
         * so `onExitComplete` doesn't fire before a sibling's exit has started.
         */
        const completedExit = exit
        queueMicrotask(() => {
            if (completedExit === exit && isComplete) boundary.exitCompleted(id)
        })
    }

    createLayoutTrigger(
        isPresent,
        (next) => {
            if (!next) registry.forEach((_, key) => registry.set(key, false))
        },
        (present) => {
            if (present) {
                if (!isExiting) return
                isExiting = false
                isComplete = false
                boundary.exitCancelled(id)
                onEnter?.()
            } else if (!isExiting) {
                isExiting = true
                isComplete = false
                exit++
                boundary.exitStarted(id)
                /**
                 * If nothing has to finish first, remove the child right away.
                 */
                complete()
            }
        },
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.PresenceChild.presence"
                    : undefined,
        }
    )

    onCleanup(() => {
        if (isExiting && !isComplete) boundary.exitCancelled(id)
        unregisterFromParent?.()
    })

    return {
        id,
        isPresent,
        /**
         * Read when a component is created: `false` for the components of the boundary's first
         * render, with `initial={false}`.
         */
        get initial() {
            return boundary.isInitialRender() &&
                boundary.props.initial === false
                ? false
                : undefined
        },
        custom: () => boundary.props.custom,
        register: (id) => {
            registry.set(id, false)
            return () => {
                registry.delete(id)
                complete()
            }
        },
        onExitComplete: (id) => {
            if (registry.has(id)) registry.set(id, true)
            complete()
        },
        hasRegistrants: () => registry.size > 0,
        exitedImmediately: () => {
            if (isExiting) return
            boundary.exitStarted(id)
            queueMicrotask(() => boundary.exitCompleted(id))
        },
    }
}
