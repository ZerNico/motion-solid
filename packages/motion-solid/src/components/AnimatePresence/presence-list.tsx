import type { JSX } from "@solidjs/web"
import { isHTMLElement } from "motion-dom"
import {
    children as resolveChildren,
    createMemo,
    createSignal,
    mapArray,
    onCleanup,
    untrack,
    type Accessor,
} from "solid-js"
import { useContext } from "solid-js"
import { PresenceContext } from "../../context/PresenceContext"
import { createLayoutTrigger } from "../../projection/layout-commit"
import { useLayoutScope } from "../../projection/layout-scope"
import { popChild, type PoppedChild } from "./PopChild"
import {
    createPresenceChild,
    PresenceBoundaryContext,
    type PresenceBoundary,
    type PresenceChild,
    type PresenceParticipant,
} from "./PresenceChild"

export interface PresenceEntry<T> {
    key: unknown
    value: T
    index: number
}

/**
 * Upstream's diff of the rendered children (`AnimatePresence`), by key: children that left are
 * kept where they were until every exiting child has completed, and in `"wait"` mode only the
 * exiting children are rendered until then.
 *
 * Port note: an `AnimatePresence` can render several lists (sibling `Show`/`For`), each diffed
 * on its own. `othersPending` is whether another list of the same `AnimatePresence` has exits
 * that haven't completed: exiting children are only removed once every exit of the
 * `AnimatePresence` is done (like upstream, which removes them all at once), and in `"wait"`
 * mode a list without exiting children of its own doesn't add entering children until then
 * (upstream would also stop rendering the present ones, see the "odd visual behaviour" warning,
 * but they're kept here so a list doesn't remount children because of another list).
 */
export function diffPresence(
    prevRendered: readonly unknown[],
    presentKeys: readonly unknown[],
    completed: { has: (key: unknown) => boolean },
    mode: "sync" | "wait" | "popLayout",
    othersPending = false
): unknown[] {
    let nextChildren = [...presentKeys]
    const exitingChildren: unknown[] = []

    /**
     * Exiting children are reinserted directly after the child they
     * previously followed. Splicing at their index within the previously
     * rendered children, as we used to, indexes into the wrong list: it
     * can interleave them with entering children and push present children
     * to new positions, remounting them (#3746).
     */
    let insertionIndex = 0

    for (const key of prevRendered) {
        const presentIndex = presentKeys.indexOf(key)

        if (presentIndex === -1) {
            nextChildren.splice(insertionIndex++, 0, key)
            exitingChildren.push(key)
        } else {
            insertionIndex = presentIndex + exitingChildren.length + 1
        }
    }

    /**
     * Once every exiting child has finished animating out, remove them
     * all at once. Otherwise, if we're in "wait" mode, we want to only
     * render the exiting children until they've all exited.
     */
    if (!othersPending && exitingChildren.every((key) => completed.has(key))) {
        nextChildren = [...presentKeys]
    } else if (mode === "wait") {
        nextChildren = exitingChildren.length
            ? exitingChildren
            : nextChildren.filter((key) => prevRendered.includes(key))
    }

    return nextChildren
}

interface Row {
    presence: PresenceChild
    /**
     * The current exit, the key of its completion in `completed`.
     */
    exit: object
}

const isSameList = (a: readonly unknown[], b: readonly unknown[]) =>
    a.length === b.length && a.every((key, index) => key === b[index])

/**
 * Port note: Solid-only. The presence-aware rendering behind `Show` and `For`: it renders the
 * entries of `present` by key, keeps the owner and DOM of an entry that's removed alive while it
 * exits (like upstream's `AnimatePresence` keeps rendering a removed React element), and reuses
 * it if the key comes back while it's exiting.
 */
export function createPresenceList<T>(
    boundary: PresenceBoundary,
    present: Accessor<readonly PresenceEntry<T>[]>,
    render: (
        value: Accessor<T>,
        index: Accessor<number>,
        key: unknown
    ) => JSX.Element,
    /**
     * Kept up to date with the keys whose child exists (present or exiting).
     */
    childKeys?: Set<unknown>
): Accessor<JSX.Element[]> {
    const scope = useLayoutScope()
    const parentPresence = useContext(PresenceContext)
    /**
     * The exits that completed, by exit (see `rows`). Port note: upstream keeps completions by
     * key and resets them when it renders. Here a completion belongs to one exit of one child, so
     * a child that comes back, or a key that's rendered again later, starts from scratch without
     * anything having to remove it (a write from the commit would make `rendered` run twice).
     */
    const [completed, setCompleted] = createSignal<ReadonlySet<object>>(
        new Set(),
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.PresenceList.completed"
                    : undefined,
        }
    )
    /**
     * Each child that exists, by key. Not reactive: `exit` changes when an exit is cancelled, and
     * a cancelled exit's child is present (its completion isn't read).
     */
    const rows = new Map<unknown, Row>()
    /**
     * Whether an exiting child is done: its exit completed, or nothing has to finish before it's
     * removed. Port note: upstream renders such a child once more and completes its exit from a
     * layout effect. Here the diff counts it as complete, so it's removed in the update that
     * removes it from the children, without a write from the commit.
     */
    const isCompleted = (done: ReadonlySet<object>) => ({
        has: (key: unknown) => {
            const row = rows.get(key)
            return (
                !!row && (done.has(row.exit) || !row.presence.hasRegistrants())
            )
        },
    })
    /**
     * Children removed before their exit started (nothing to wait for), reported to the boundary
     * once the update that removed them commits. Not when the list itself is disposed: like an
     * exit in progress, theirs is cancelled then.
     */
    const removedBeforeExit = new Map<unknown, PresenceChild>()

    const presentEntries = createMemo(
        () => {
            const entries = new Map<unknown, PresenceEntry<T>>()
            if (!boundary.isPresent()) return entries
            for (const entry of present()) entries.set(entry.key, entry)
            return entries
        },
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.PresenceList.presentEntries"
                    : undefined,
        }
    )

    /**
     * The keys rendered by the latest run of `rendered`, for `hasPendingExits` (read by the other
     * participants, possibly before `rendered` re-runs in the same flush: either value gives the
     * same answer).
     */
    let lastRendered: readonly unknown[] = []
    let committedCount = 0

    /**
     * The nodes of each rendered child.
     */
    const childNodes = new Set<{ toArray: () => unknown[] }>()

    const participant: PresenceParticipant = {
        hasPendingExits: () => {
            const entries = presentEntries()
            const done = isCompleted(completed())
            return lastRendered.some(
                (key) => !entries.has(key) && !done.has(key)
            )
        },
        renderedCount: () => committedCount,
        ownsNode: (node) => {
            for (const nodes of childNodes) {
                if (nodes.toArray().includes(node)) return true
            }
            return false
        },
    }
    boundary.addParticipant(participant)

    /**
     * Whether an exit other than `key`'s, of this list or another participant, is pending.
     */
    const hasOtherPendingExits = (key: unknown) => {
        const entries = presentEntries()
        const done = isCompleted(completed())
        return (
            boundary.hasPendingExits(participant) ||
            lastRendered.some(
                (other) =>
                    other !== key && !entries.has(other) && !done.has(other)
            )
        )
    }

    const rendered = createMemo<unknown[]>(
        (prev) =>
            (lastRendered = diffPresence(
                prev ?? [],
                Array.from(presentEntries().keys()),
                isCompleted(completed()),
                boundary.props.mode ?? "sync",
                boundary.hasPendingExits(participant)
            )),
        {
            equals: isSameList,
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.PresenceList.rendered"
                    : undefined,
        }
    )

    /**
     * Port note: upstream re-renders the siblings of children that enter or exit
     * (`presenceAffectsLayout`), which snapshots their layout.
     */
    createLayoutTrigger(
        rendered,
        () => {
            if (boundary.props.presenceAffectsLayout === false) return
            scope.snapshot()
            boundary.layoutGroup.group?.dirty()
        },
        (keys) => {
            for (const [key, presence] of removedBeforeExit) {
                if (!keys.includes(key)) presence.exitedImmediately()
            }
            removedBeforeExit.clear()
            committedCount = keys.length
            boundary.participantCommitted()
        },
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.PresenceList.layout"
                    : undefined,
        }
    )

    return mapArray(
        rendered,
        (key) => {
            const entry = createMemo<PresenceEntry<T> | undefined>(
                (prev) => presentEntries().get(key) ?? prev,
                {
                    name:
                        process.env.NODE_ENV !== "production"
                            ? "Motion.PresenceList.entry"
                            : undefined,
                }
            )
            const isPresent = createMemo(
                () =>
                    presentEntries().has(key) &&
                    (parentPresence ? parentPresence.isPresent() : true),
                {
                    name:
                        process.env.NODE_ENV !== "production"
                            ? "Motion.PresenceList.isPresent"
                            : undefined,
                }
            )

            const row = { exit: {} } as Row
            const presence = (row.presence = createPresenceChild(
                boundary,
                isPresent,
                () => {
                    /**
                     * The diff counts a child with nothing to wait for as complete, and only keeps
                     * rendering one while another exit is pending: that exit's completion runs the
                     * diff again.
                     */
                    if (
                        !presence.hasRegistrants() &&
                        untrack(() => hasOtherPendingExits(key))
                    ) {
                        return
                    }
                    setCompleted((done) => {
                        // Only the current exits of the children that exist can still be read.
                        const next = new Set<object>()
                        for (const { exit } of rows.values()) {
                            if (done.has(exit)) next.add(exit)
                        }
                        return next.add(row.exit)
                    })
                },
                () => {
                    row.exit = {}
                },
                parentPresence
            ))
            rows.set(key, row)

            /**
             * Port note: upstream's `AnimatePresence` only governs its direct children. `Show`/`For`
             * inside this child don't join the boundary (they're Solid's own, or join an
             * `AnimatePresence` of their own).
             */
            const nodes = resolveChildren(() => (
                <PresenceBoundaryContext value={null}>
                    <PresenceContext value={presence}>
                        {untrack(() =>
                            render(
                                () => entry()!.value,
                                () => entry()!.index,
                                key
                            )
                        )}
                    </PresenceContext>
                </PresenceBoundaryContext>
            ))

            /**
             * `mode="popLayout"`: take the exiting child out of the layout, measured before the
             * DOM updates (upstream: `PopChild`).
             */
            let popped: PoppedChild[] | undefined
            const restore = () => {
                popped?.forEach((child) => child.restore())
                popped = undefined
            }

            createLayoutTrigger(
                isPresent,
                (next) => {
                    if (next || boundary.props.mode !== "popLayout") return
                    popped = nodes
                        .toArray()
                        .filter(isHTMLElement)
                        .map((element) => popChild(element as HTMLElement))
                },
                (present) => {
                    if (present) {
                        restore()
                    } else {
                        const { anchorX, anchorY, root } = boundary.props
                        popped?.forEach((child) =>
                            child.pop(
                                { anchorX, anchorY, root },
                                boundary.nonce
                            )
                        )
                    }
                },
                {
                    name:
                        process.env.NODE_ENV !== "production"
                            ? "Motion.PresenceList.popLayout"
                            : undefined,
                }
            )

            childNodes.add(nodes)
            childKeys?.add(key)
            onCleanup(() => {
                childNodes.delete(nodes)
                childKeys?.delete(key)
                if (rows.get(key) === row) rows.delete(key)
                if (!untrack(() => presentEntries().has(key))) {
                    removedBeforeExit.set(key, presence)
                }
                restore()
            })

            return nodes as unknown as JSX.Element
        },
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.PresenceList.rows"
                    : undefined,
        }
    )
}
