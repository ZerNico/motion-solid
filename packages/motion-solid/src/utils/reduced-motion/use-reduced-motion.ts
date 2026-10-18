import { isServer } from "@solidjs/web"
import {
    hasReducedMotionListener,
    initPrefersReducedMotion,
    prefersReducedMotion,
} from "motion-dom"
import { warnOnce } from "motion-utils"
import { createSignal, type Accessor } from "solid-js"

/**
 * Port note: Solid-only. The device's Reduced Motion setting as a signal, shared by every
 * `useReducedMotion`, updated when it changes.
 */
let preference: Accessor<boolean | null> | undefined

function getPreference(): Accessor<boolean | null> {
    if (preference) return preference

    /**
     * Lazy initialisation of prefersReducedMotion
     */
    !hasReducedMotionListener.current && initPrefersReducedMotion()

    if (isServer || typeof window === "undefined" || !window.matchMedia) {
        return () => prefersReducedMotion.current
    }

    const [matches, setMatches] = createSignal(prefersReducedMotion.current)
    window
        .matchMedia("(prefers-reduced-motion)")
        .addEventListener("change", (event) => setMatches(event.matches))

    return (preference = matches)
}

/**
 * A hook that returns `true` if we should be using reduced motion based on the current device's Reduced Motion setting.
 *
 * This can be used to implement changes to your UI based on Reduced Motion. For instance, replacing motion-sickness inducing
 * `x`/`y` animations with `opacity`, disabling the autoplay of background videos, or turning off parallax motion.
 *
 * It will actively respond to changes and re-render your components with the latest setting.
 *
 * ```jsx
 * export function Sidebar(props) {
 *   const shouldReduceMotion = useReducedMotion()
 *   const closedX = () => (shouldReduceMotion() ? 0 : "-100%")
 *
 *   return (
 *     <motion.div animate={{
 *       opacity: props.isOpen ? 1 : 0,
 *       x: props.isOpen ? 0 : closedX()
 *     }} />
 *   )
 * }
 * ```
 *
 * Port note: returns an accessor, which follows the setting when it changes (upstream reads it
 * once, when the component is created).
 *
 * @return An accessor of whether we should reduce motion.
 *
 * @public
 */
export function useReducedMotion(): Accessor<boolean | null> {
    const shouldReduceMotion = getPreference()

    if (process.env.NODE_ENV !== "production") {
        warnOnce(
            prefersReducedMotion.current !== true,
            "You have Reduced Motion enabled on your device. Animations may not appear as expected.",
            "reduced-motion-disabled"
        )
    }

    return shouldReduceMotion
}
