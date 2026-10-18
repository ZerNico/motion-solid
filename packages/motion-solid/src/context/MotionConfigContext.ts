import type { ReducedMotionConfig, Transition } from "motion-dom"
import type { TransformPoint } from "motion-utils"
import { createContext } from "solid-js"

export type { ReducedMotionConfig }
export type IsValidProp = (key: string) => boolean

/**
 * @public
 */
export interface MotionConfigContext {
    /**
     * Internal, exported only for usage in Framer
     */
    transformPagePoint: TransformPoint

    /**
     * Internal. Determines whether this is a static context ie the Framer canvas. If so,
     * it'll disable all dynamic functionality.
     */
    isStatic: boolean

    /**
     * Defines a new default transition for the entire tree.
     *
     * @public
     */
    transition?: Transition

    /**
     * If true, will respect the device prefersReducedMotion setting by switching
     * transform animations off.
     *
     * @public
     */
    reducedMotion?: ReducedMotionConfig

    /**
     * A custom `nonce` attribute used when wanting to enforce a Content Security Policy (CSP).
     *
     * @public
     */
    nonce?: string

    /**
     * If true, all animations will be skipped and values will be set instantly.
     * Useful for E2E tests and visual regression testing.
     *
     * @public
     */
    skipAnimations?: boolean

    /**
     * Determines whether a prop should be forwarded to the DOM.
     * Useful when wrapping Motion components with a styling library.
     *
     * @public
     */
    isValidProp?: IsValidProp
}

/**
 * @public
 *
 * Port note: the value is read through getters, so `MotionConfig` can provide reactive values.
 */
export const MotionConfigContext = createContext<MotionConfigContext>({
    transformPagePoint: (p) => p,
    isStatic: false,
    reducedMotion: "never",
})
