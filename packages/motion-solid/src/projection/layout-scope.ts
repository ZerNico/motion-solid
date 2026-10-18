import { createContext, createMemo, useContext, type Accessor } from "solid-js"
import { createLayoutTrigger, getCommitId, guard } from "./layout-commit"

/**
 * Port note: Solid-only. Upstream snapshots the components that re-render, which is usually the
 * subtree of the component whose state changed. Solid doesn't re-render, so layout snapshots are
 * scoped by a tree mirroring the motion tree: every `motion` component, `LayoutGroup` and
 * `AnimatePresence` is a scope, and every mounted component that measures its layout is a
 * participant of its closest scope. When something can move elements around (a component's
 * props, its children, presence), the closest scope's subtree is snapshot: the changed element,
 * its siblings and their descendants.
 */
export interface LayoutParticipant {
    /**
     * Snapshot with the participant's committed props.
     */
    snapshot(): void
}

export class LayoutScope {
    readonly children = new Set<LayoutScope>()
    readonly participants = new Set<LayoutParticipant>()
    private lastCommit = -1
    private lastDeepCommit = -1

    /**
     * @param isolated - A `LayoutGroup` with its own node group (`inherit` isn't `true`): like
     * upstream, its members aren't measured with what's outside it (they follow their parent's
     * layout through their relative target), so snapshots from outside don't descend into it.
     */
    constructor(readonly parent?: LayoutScope, readonly isolated = false) {
        parent?.children.add(this)
    }

    dispose() {
        this.parent?.children.delete(this)
    }

    /**
     * Snapshot every participant in this scope's subtree, once per commit.
     *
     * @param deep - Also descend into isolated `LayoutGroup`s, like upstream re-rendering this
     * subtree (e.g. the component whose children changed).
     */
    snapshot(deep = false) {
        const commit = getCommitId()
        if ((deep ? this.lastDeepCommit : this.lastCommit) === commit) return

        if (this.lastCommit !== commit) {
            this.lastCommit = commit
            this.participants.forEach((participant) =>
                guard(() => participant.snapshot())
            )
        }
        if (deep) this.lastDeepCommit = commit

        this.children.forEach((child) => {
            if (deep || !child.isolated) child.snapshot(deep)
        })
    }
}

/**
 * Participants without a scope above them.
 */
export const rootLayoutScope = new LayoutScope()

export const LayoutScopeContext = createContext<LayoutScope>(rootLayoutScope)

export const useLayoutScope = () => useContext(LayoutScopeContext)

/**
 * Port note: Solid-only. Elements sharing a `layoutId` animate from each other, wherever they
 * are in the tree. Upstream, the state change that adds or removes one usually re-renders the
 * others too (e.g. a gallery and its lightbox, rendered by the same component), which snapshots
 * them. Here, when a member of a `layoutId` stack is added, removed or changes presence, the
 * other members are snapshot with it.
 */
export interface SharedLayoutMember {
    layoutId(): string | undefined
    snapshot(): void
}

const sharedLayoutMembers = new Set<SharedLayoutMember>()

export function registerSharedLayoutMember(member: SharedLayoutMember) {
    sharedLayoutMembers.add(member)
    return () => {
        sharedLayoutMembers.delete(member)
    }
}

export function snapshotSharedLayout(
    layoutId: string | undefined,
    except?: SharedLayoutMember
) {
    if (layoutId === undefined) return
    sharedLayoutMembers.forEach((member) => {
        if (member !== except && member.layoutId() === layoutId) {
            guard(() => member.snapshot())
        }
    })
}

const isSameList = (a: readonly unknown[], b: readonly unknown[]) =>
    a.length === b.length && a.every((key, index) => key === b[index])

/**
 * Port note: Solid-only. Solid's `<For>` adds, removes and reorders its children's DOM nodes
 * without re-running them, so nothing in a `motion` child sees a reorder. Upstream re-renders the
 * list with its parent, which snapshots its layout. A list (`For`) calls this with its keys, in
 * order: when they change, the closest scope's subtree (the list's items, their siblings and
 * their descendants) is snapshot at the commit, before the DOM nodes move.
 *
 * Only needed outside a `motion` parent (and outside `AnimatePresence`, whose list snapshots
 * itself): a `motion` parent snapshots its subtree when its children change.
 */
export function createListLayoutTrigger(
    keys: Accessor<readonly unknown[]>,
    options?: { transparent?: boolean }
) {
    const scope = useLayoutScope()
    const order = createMemo(() => [...keys()], {
        equals: isSameList,
        ...options,
    })
    createLayoutTrigger(order, () => scope.snapshot(), undefined, options)
}
