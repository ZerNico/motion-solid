/**
 * Port note: Solid-only. Upstream snapshots the layout whenever a component re-renders. Here
 * snapshots are taken when a change can move elements around in the same update. Props that only
 * drive animations (which move things in later frames, after the measurement) are skipped.
 */
const animationOnlyProps = new Set([
    "animate",
    "initial",
    "exit",
    "variants",
    "transition",
    "custom",
    "inherit",
    "transformTemplate",
    "viewport",
    "propagate",
    "globalTapTarget",
    "isStatic",
    "isValidProp",
    "transformPagePoint",
    "reducedMotion",
    "skipAnimations",
    "nonce",
])

function isAnimationOnlyProp(key: string) {
    return (
        animationOnlyProps.has(key) ||
        key.startsWith("while") ||
        key.startsWith("on")
    )
}

/**
 * Inline objects (`style={{ … }}`, `class={[…]}`) are recreated whenever the props are read again.
 */
function isShallowEqual(a: unknown, b: unknown) {
    if (a === b) return true
    if (
        !a ||
        !b ||
        typeof a !== "object" ||
        typeof b !== "object" ||
        Array.isArray(a) !== Array.isArray(b)
    ) {
        return false
    }
    const aKeys = Object.keys(a)
    if (aKeys.length !== Object.keys(b).length) return false
    for (const key of aKeys) {
        if ((a as any)[key] !== (b as any)[key]) return false
    }
    return true
}

export function isLayoutAffectingChange(
    prev: { props: Record<string, any> },
    next: { props: Record<string, any> }
) {
    const prevProps = prev.props
    const nextProps = next.props
    if (prevProps === nextProps) return false

    for (const key in nextProps) {
        if (
            !isAnimationOnlyProp(key) &&
            !isShallowEqual(prevProps[key], nextProps[key])
        ) {
            return true
        }
    }
    for (const key in prevProps) {
        if (!(key in nextProps) && !isAnimationOnlyProp(key)) return true
    }
    return false
}
