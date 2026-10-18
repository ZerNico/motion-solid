/**
 * Port note: mirrors upstream's `framer-motion` entry (what `motion/react` re-exports), for the
 * parts that are ported so far.
 */
export * from "motion-dom"
export * from "motion-utils"

/**
 * Framework-agnostic (upstream's `dom.ts`, also the `@motion-s/solid/dom` entry)
 */
export * from "./dom"
// Keep explicit delay in milliseconds export for BC with Framer
// (a local export shadows `dom.ts`'s `delayInSeconds as delay`, like upstream)
export { delay, type DelayedFunction } from "motion-dom"
export { animationControls } from "./animation/hooks/animation-controls"
export { startOptimizedAppearAnimation } from "./animation/optimized-appear/start"
export type * from "./animation/types"

/**
 * Components
 */
export { AnimatePresence } from "./components/AnimatePresence"
export { For, Show } from "./components/AnimatePresence/control-flow"
export {
    useIsPresent,
    usePresence,
    usePresenceData,
} from "./components/AnimatePresence/use-presence"
export { LayoutGroup } from "./components/LayoutGroup"
export { MotionConfig } from "./components/MotionConfig"
export { Reorder } from "./components/Reorder"
export { motion } from "./render/components/motion/proxy"
export { m } from "./render/components/m/proxy"
export { LazyMotion } from "./components/LazyMotion"
export type { LazyProps } from "./components/LazyMotion/types"
export { LazyContext } from "./context/LazyContext"
export { createMotionComponent } from "./motion"
export type {
    MotionComponent,
    MotionComponentOptions,
    MotionComponentProps,
} from "./motion"

/**
 * Values
 */
export { useMotionValue } from "./value/use-motion-value"
export { useTransform } from "./value/use-transform"
export { useSpring } from "./value/use-spring"
export { useFollowValue } from "./value/use-follow-value"
export type { FollowValueOptions } from "motion-dom"
export { useVelocity } from "./value/use-velocity"
export { useMotionTemplate } from "./value/use-motion-template"
export { useTime } from "./value/use-time"
export { useScroll, type UseScrollOptions } from "./value/use-scroll"
export { useElementScroll } from "./value/scroll/use-element-scroll"
export { useViewportScroll } from "./value/scroll/use-viewport-scroll"
export type { ScrollMotionValues } from "./value/scroll/utils"
export { useWillChange } from "./value/use-will-change"
export { WillChangeMotionValue } from "./value/use-will-change/WillChangeMotionValue"
export { useMotionValueEvent } from "./utils/use-motion-value-event"
export { useMotionValueAccessor } from "./value/use-motion-value-accessor"
export type { MaybeAccessor } from "./utils/access"

/**
 * Hooks
 */
export { useAnimate } from "./animation/hooks/use-animate"
export { useAnimateMini } from "./animation/hooks/use-animate-style"
export type { SolidAnimationScope } from "./animation/hooks/scope"
export {
    useAnimation,
    useAnimationControls,
} from "./animation/hooks/use-animation"
export { useAnimationFrame } from "./utils/use-animation-frame"
export { useCycle, type Cycle, type CycleState } from "./utils/use-cycle"
export { useInView, type UseInViewOptions } from "./utils/use-in-view"
export { usePageInView } from "./utils/use-page-in-view"
export { useReducedMotion } from "./utils/reduced-motion/use-reduced-motion"
export { useReducedMotionConfig } from "./utils/reduced-motion/use-reduced-motion-config"
export { useDomEvent } from "./events/use-dom-event"
export {
    DragControls,
    useDragControls,
} from "./gestures/drag/use-drag-controls"
export { addPointerEvent } from "./events/add-pointer-event"
export { addPointerInfo } from "./events/event-info"
export { useInstantLayoutTransition } from "./projection/use-instant-layout-transition"
export { useResetProjection } from "./projection/use-reset-projection"
export {
    disableInstantTransitions,
    useInstantTransition,
} from "./utils/use-instant-transition"
export type { ElementRef } from "./utils/refs"
export { isBrowser } from "./utils/is-browser"
export { useUnmountEffect } from "./utils/use-unmount-effect"
export { transformViewBoxPoint } from "./utils/transform-viewbox-point"
export { correctParentTransform } from "./utils/transform-rotated-parent"

/**
 * Features
 */
export { animations } from "./motion/features/animations"
export { domAnimation } from "./render/dom/features-animation"
export { domMax } from "./render/dom/features-max"
export { domMin } from "./render/dom/features-min"
export { filterProps } from "./render/dom/utils/filter-props"
export { isValidMotionProp } from "./motion/utils/valid-prop"
export { isMotionComponent } from "./motion/utils/is-motion-component"
export { unwrapMotionComponent } from "./motion/utils/unwrap-motion-component"
export { makeUseVisualState } from "./motion/utils/use-visual-state"
export type { VisualState } from "./motion/utils/use-visual-state"
export type {
    ResolvedValues,
    ScrapeMotionValuesFromProps,
    CreateVisualElement,
} from "./render/types"

/**
 * Contexts
 */
export { LayoutGroupContext } from "./context/LayoutGroupContext"
export { MotionConfigContext } from "./context/MotionConfigContext"
export { MotionContext } from "./context/MotionContext"
export { PresenceContext } from "./context/PresenceContext"
export { SwitchLayoutGroupContext } from "./context/SwitchLayoutGroupContext"

/**
 * Types
 */
export type { AnimatePresenceProps } from "./components/AnimatePresence/types"
export type { MotionConfigProps } from "./components/MotionConfig"
export type {
    HydratedFeatureDefinition,
    HydratedFeatureDefinitions,
    FeatureDefinition,
    FeatureDefinitions,
    FeaturePackage,
    FeaturePackages,
    FeatureBundle,
    LazyFeatureBundle,
} from "./motion/features/types"
export type {
    MotionProps,
    MotionStyle,
    MotionTransform,
    VariantLabels,
} from "./motion/types"
export type {
    DOMMotionComponents,
    HTMLMotionProps,
    SVGAttributesAsMotionValues,
    SVGMotionProps,
} from "./render/dom/types"
