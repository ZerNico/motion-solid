/**
 * Port note: Solid-only. Upstream hooks take React ref objects (`{ current }`). Here they take
 * an element, an accessor of one (e.g. a signal set by `ref={setElement}`, which is tracked), or
 * a `{ current }` object (like `useAnimate`'s scope).
 */
export type ElementRef<T extends EventTarget = Element> =
    | T
    | null
    | undefined
    | (() => T | null | undefined)
    | { current: T | null | undefined }

export function resolveRef<T extends EventTarget>(
    ref: ElementRef<T> | undefined
): T | undefined {
    if (!ref) return undefined
    if (typeof ref === "function") return ref() ?? undefined
    if ("current" in ref) return ref.current ?? undefined
    return ref
}
