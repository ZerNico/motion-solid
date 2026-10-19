import { isServer, type JSX } from "@solidjs/web"
import {
    For as SolidFor,
    Show as SolidShow,
    createMemo,
    getOwner,
    runWithOwner,
    isHydrating,
    untrack,
    type Accessor,
} from "solid-js"
import { createListLayoutTrigger } from "../../projection/layout-scope"
import { usePresenceBoundary, type PresenceBoundary } from "./PresenceChild"
import { createPresenceList, type PresenceEntry } from "./presence-list"

/**
 * Port note: Solid-only. Solid's `<Show>`/`<For>` dispose a child as soon as it's removed, before
 * an `AnimatePresence` can keep it while it exits. These have the same props, and inside an
 * `AnimatePresence` they keep a removed child (its owner, its DOM) until its exit is done, like
 * upstream keeps rendering a removed React element. A child that comes back while exiting is the
 * same instance, and its exit reverses. Outside an `AnimatePresence`, or when they're not its
 * direct children (see `createControlFlow`), they're Solid's own.
 */

const fallbackKey = Symbol("fallback")
const whenKey = Symbol("when")

type AnyProps = Record<string, any>

function isRenderCallback(
    children: unknown
): children is (...args: any[]) => any {
    return typeof children === "function" && children.length > 0
}

/**
 * Whether a `fallback` is passed, without creating it (reading a JSX prop creates its
 * elements). Like Solid's `For`, a `fallback` prop counts, except a static `undefined`.
 */
function hasFallback(props: AnyProps) {
    if (!("fallback" in props)) return false
    const descriptor = Object.getOwnPropertyDescriptor(props, "fallback")
    return !descriptor || "get" in descriptor || descriptor.value !== undefined
}

/**
 * Port note: Solid-only. Upstream's `AnimatePresence` only governs its direct children. Here a
 * `Show`/`For` joins the closest `AnimatePresence` when the `AnimatePresence` reads it directly
 * while resolving its children: through components, fragments, conditionals and Solid's own
 * control flow, but not through an element, a context provider, or another presence child
 * (whose `Show`/`For` are Solid's own, or join an `AnimatePresence` of their own).
 *
 * Who reads it is only known when it's first read, so it's created then, like Solid's `For`.
 * On the server and while hydrating it has to be created right away (hydration ids follow
 * creation order): it then joins the closest `AnimatePresence` unless it's inside another
 * presence child.
 */
function createControlFlow(
    props: AnyProps,
    solid: (props: any) => JSX.Element,
    createList: (boundary: PresenceBoundary) => Accessor<JSX.Element[]>
): JSX.Element {
    const boundary = usePresenceBoundary()
    if (!boundary) return solid(props)

    const owner = getOwner()
    const create = (joins: boolean) =>
        runWithOwner(owner, () =>
            joins ? createList(boundary) : solid(props)
        ) as unknown as () => JSX.Element

    if (isServer || isHydrating()) return create(true) as unknown as JSX.Element

    let rendered: (() => JSX.Element) | undefined
    const read = () => (rendered ??= create(boundary.isDirectRead()))()
    return read as unknown as JSX.Element
}

function ShowImpl(props: AnyProps): JSX.Element {
    return createControlFlow(props, SolidShow, (boundary) => {
        const keyed = untrack(() => props.keyed) === true

        const present = createMemo(
            (): PresenceEntry<unknown>[] => {
                const when = props.when
                if (when) {
                    return [
                        { key: keyed ? when : whenKey, value: when, index: 0 },
                    ]
                }
                return hasFallback(props)
                    ? [{ key: fallbackKey, value: undefined, index: 0 }]
                    : []
            },
            {
                name:
                    process.env.NODE_ENV !== "production"
                        ? "Motion.Show.present"
                        : undefined,
            }
        )

        return createPresenceList(boundary, present, (value, _index, key) => {
            if (key === fallbackKey) return props.fallback
            const children = props.children
            if (!isRenderCallback(children)) return children
            return keyed
                ? children(value())
                : children(value as Accessor<unknown>)
        })
    })
}

/**
 * The key of a duplicate item: its key with its occurrence (Solid's `For` renders duplicates).
 */
interface DuplicateKey {
    key: unknown
    occurrence: number
}

function getForKey(keyed: unknown): (item: unknown, index: number) => unknown {
    return keyed === false
        ? (_item, index) => index
        : typeof keyed === "function"
        ? (item) => keyed(item)
        : (item) => item
}

/**
 * Port note: Solid-only. Solid's `For` moves the nodes of reordered items without re-running
 * them, so nothing in a `layout` child takes a snapshot. Outside a presence list (which snapshots
 * when what it renders changes), this snapshots the closest layout scope when the order changes.
 */
function SolidForWithLayout(props: AnyProps): JSX.Element {
    if (!isServer) {
        const getKey = getForKey(untrack(() => props.keyed))
        createListLayoutTrigger(
            () =>
                ((props.each || []) as readonly unknown[]).map((item, index) =>
                    getKey(item, index)
                ),
            { transparent: true }
        )
    }
    return SolidFor(props as any)
}

function ForImpl(props: AnyProps): JSX.Element {
    return createControlFlow(props, SolidForWithLayout, (boundary) => {
        const keyed = untrack(() => props.keyed)
        const getKey = getForKey(keyed)

        /**
         * The keys of the duplicates (by occurrence), reused while they're in the list or their
         * child exists (exiting), so a duplicate that comes back keeps its child.
         */
        let duplicateKeys = new Map<unknown, (DuplicateKey | undefined)[]>()
        const childKeys = new Set<unknown>()

        const present = createMemo(
            (): PresenceEntry<unknown>[] => {
                const each = (props.each || []) as readonly unknown[]
                const occurrences = new Map<unknown, number>()
                const nextDuplicateKeys = new Map<
                    unknown,
                    (DuplicateKey | undefined)[]
                >()
                const used = new Set<DuplicateKey>()

                const entries = each.map((item, index) => {
                    let key = getKey(item, index)
                    const occurrence = occurrences.get(key) ?? 0
                    occurrences.set(key, occurrence + 1)

                    if (occurrence > 0) {
                        let keys = nextDuplicateKeys.get(key)
                        if (!keys) {
                            keys = [...(duplicateKeys.get(key) ?? [])]
                            nextDuplicateKeys.set(key, keys)
                        }
                        const duplicate = (keys[occurrence - 1] ??= {
                            key,
                            occurrence,
                        })
                        used.add(duplicate)
                        key = duplicate
                    }

                    return { key, value: item, index }
                })

                duplicateKeys.forEach((keys, key) => {
                    const nextKeys = nextDuplicateKeys.get(key) ?? [...keys]
                    for (let i = 0; i < nextKeys.length; i++) {
                        const duplicate = nextKeys[i]
                        if (
                            duplicate &&
                            !used.has(duplicate) &&
                            !childKeys.has(duplicate)
                        ) {
                            nextKeys[i] = undefined
                        }
                    }
                    while (nextKeys.length && !nextKeys[nextKeys.length - 1]) {
                        nextKeys.pop()
                    }
                    if (nextKeys.length) nextDuplicateKeys.set(key, nextKeys)
                    else nextDuplicateKeys.delete(key)
                })
                duplicateKeys = nextDuplicateKeys

                if (!entries.length && hasFallback(props)) {
                    return [{ key: fallbackKey, value: undefined, index: 0 }]
                }
                return entries
            },
            {
                name:
                    process.env.NODE_ENV !== "production"
                        ? "Motion.For.present"
                        : undefined,
            }
        )

        return createPresenceList(
            boundary,
            present,
            (value, index, key) => {
                if (key === fallbackKey) return props.fallback
                const render = props.children as (...args: any[]) => JSX.Element
                if (keyed === false) return render(value, untrack(index))
                if (typeof keyed === "function") return render(value, index)
                return render(untrack(value), index)
            },
            childKeys
        )
    })
}

/**
 * Like Solid's `<Show>`. Inside an `AnimatePresence`, a child that's hidden exits before it's
 * removed: `fallback` and children enter and exit like any other children.
 *
 * ```jsx
 * <AnimatePresence>
 *   <Show when={isVisible()}>
 *     <motion.div exit={{ opacity: 0 }} />
 *   </Show>
 * </AnimatePresence>
 * ```
 *
 * With `keyed`, a new `when` value is a new child: the previous one exits (use `mode="wait"` to
 * swap them one after the other).
 *
 * An exiting child keeps rendering: read `when` through the callback form, which keeps its last
 * value. Reading removed data directly (`{record()!.label}`) throws while it exits.
 *
 * ```jsx
 * <Show when={record()}>{(record) => <motion.p exit={{ opacity: 0 }}>{record().label}</motion.p>}</Show>
 * ```
 */
export const Show = ShowImpl as unknown as typeof SolidShow

/**
 * Like Solid's `<For>`. Inside an `AnimatePresence`, items that are removed exit before they're
 * removed, where they were.
 *
 * ```jsx
 * <AnimatePresence>
 *   <For each={items()}>
 *     {(item) => <motion.li layout exit={{ opacity: 0 }} />}
 *   </For>
 * </AnimatePresence>
 * ```
 */
export const For = ForImpl as unknown as typeof SolidFor
