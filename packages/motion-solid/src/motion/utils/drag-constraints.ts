import { untrack } from "solid-js"

/**
 * Port note: Solid-only. Upstream's `dragConstraints` is a bounding box or a React ref object,
 * which the drag controls read as `ref.current`. Solid users pass the constraining element, or an
 * accessor of it (e.g. a signal set by `ref`), so those are turned into a stable ref object.
 */
const refs = new WeakMap<object, { readonly current: Element | null }>()

export function toConstraintsRef(constraints: unknown) {
    if (typeof Element !== "undefined" && constraints instanceof Element) {
        let ref = refs.get(constraints)
        if (!ref) {
            ref = { current: constraints }
            refs.set(constraints, ref)
        }
        return ref
    }

    if (typeof constraints === "function") {
        let ref = refs.get(constraints)
        if (!ref) {
            const accessor = constraints as () => Element | null | undefined
            ref = {
                get current() {
                    // Read by the drag controls, not in a tracking scope.
                    return untrack(accessor) ?? null
                },
            }
            refs.set(constraints, ref)
        }
        return ref
    }

    return constraints
}
