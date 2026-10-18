export * from "motion-dom"
export * from "motion-utils"

export { animate, createScopedAnimate } from "./animation/animate"
export { animateMini } from "./animation/animators/waapi/animate-style"
export { scroll } from "./render/dom/scroll"
export { scrollInfo } from "./render/dom/scroll/track"
export { inView } from "./render/dom/viewport"
/**
 * Port note: a type-only export (`HTMLElements` is a type), so per-file transpilers (esbuild,
 * Vite) don't emit a runtime re-export of a binding that doesn't exist.
 */
export type { HTMLElements } from "./render/html/supported-elements"

/**
 * Types
 */
export * from "./animation/sequence/types"

/**
 * Utils
 */
export { delayInSeconds as delay, type DelayedFunction } from "motion-dom"
export * from "./utils/distance"
