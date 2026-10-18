import type {
    AnyResolvedKeyframe,
    MotionValue,
    PresenceContextProps,
    ResolvedValues,
    VisualElement,
    VisualElementEventCallbacks,
    LayoutLifecycles,
    UseRenderState,
} from "motion-dom"
import type { Component } from "solid-js"
import type { ReducedMotionConfig } from "../context/MotionConfigContext"
import type { MotionProps } from "../motion/types"
import type { VisualState } from "../motion/utils/use-visual-state"

export type { VisualElementEventCallbacks, LayoutLifecycles, UseRenderState }

export type ScrapeMotionValuesFromProps = (
    props: MotionProps,
    prevProps: MotionProps,
    visualElement?: VisualElement
) => {
    [key: string]: MotionValue | AnyResolvedKeyframe
}

export interface VisualElementOptions<Instance, RenderState = any> {
    visualState: VisualState<Instance, RenderState>
    parent?: VisualElement<unknown>
    variantParent?: VisualElement<unknown>
    presenceContext: PresenceContextProps | null
    props: MotionProps
    blockInitialAnimation?: boolean
    reducedMotionConfig?: ReducedMotionConfig
    /**
     * If true, all animations will be skipped and values will be set instantly.
     * Useful for E2E tests and visual regression testing.
     */
    skipAnimations?: boolean
    /**
     * Explicit override for SVG detection. When true, uses SVG rendering;
     * when false, uses HTML rendering. If undefined, auto-detects.
     */
    isSVG?: boolean
}

// Re-export ResolvedValues from motion-dom for backward compatibility
export type { ResolvedValues }

export type CreateVisualElement<TagName extends string = string> = (
    Component: TagName | string | Component<any>,
    options: VisualElementOptions<HTMLElement | SVGElement>
) => VisualElement<HTMLElement | SVGElement>
