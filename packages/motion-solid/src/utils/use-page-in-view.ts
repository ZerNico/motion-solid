import { createSignal, onCleanup, type Accessor } from "solid-js"

/**
 * Whether the page is visible (`document.hidden`).
 *
 * Port note: returns an accessor.
 *
 * @public
 */
export function usePageInView(): Accessor<boolean> {
    const [isInView, setIsInView] = createSignal(
        typeof document === "undefined" ? true : !document.hidden
    )

    if (typeof document === "undefined") return isInView

    const handleVisibilityChange = () => setIsInView(!document.hidden)

    document.addEventListener("visibilitychange", handleVisibilityChange)
    onCleanup(() =>
        document.removeEventListener("visibilitychange", handleVisibilityChange)
    )

    return isInView
}
