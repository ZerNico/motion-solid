import {
    AnyResolvedKeyframe,
    isAnimationControls,
    isControllingVariants as checkIsControllingVariants,
    isVariantNode as checkIsVariantNode,
    ResolvedValues,
    resolveVariantFromProps,
    resolveMotionValue,
} from "motion-dom"
import type { MotionContextProps } from "../../context/MotionContext"
import type { PresenceContextProps } from "../../context/PresenceContext"
import type { ScrapeMotionValuesFromProps } from "../../render/types"
import type { MotionProps } from "../types"

export interface VisualState<Instance, RenderState> {
    renderState: RenderState
    latestValues: ResolvedValues
    onMount?: (instance: Instance) => void
}

/**
 * Port note: upstream's `useVisualState` hook builds the state once (`useConstant`). Solid
 * components run once, so this is a plain function called when the component is created.
 */
export type MakeVisualState<Instance, RenderState> = (
    props: MotionProps,
    context: MotionContextProps,
    presenceContext: PresenceContextProps | null
) => VisualState<Instance, RenderState>

export interface UseVisualStateConfig<RenderState> {
    scrapeMotionValuesFromProps: ScrapeMotionValuesFromProps
    createRenderState: () => RenderState
}

function makeState<I, RS>(
    {
        scrapeMotionValuesFromProps,
        createRenderState,
    }: UseVisualStateConfig<RS>,
    props: MotionProps,
    context: MotionContextProps,
    presenceContext: PresenceContextProps | null
) {
    const state: VisualState<I, RS> = {
        latestValues: makeLatestValues(
            props,
            context,
            presenceContext,
            scrapeMotionValuesFromProps
        ),
        renderState: createRenderState(),
    }

    return state
}

function makeLatestValues(
    props: MotionProps,
    context: MotionContextProps,
    presenceContext: PresenceContextProps | null,
    scrapeMotionValues: ScrapeMotionValuesFromProps
) {
    const values: ResolvedValues = {}

    const motionValues = scrapeMotionValues(props, {})
    for (const key in motionValues) {
        values[key] = resolveMotionValue(motionValues[key])
    }

    let { initial, animate } = props
    const isControllingVariants = checkIsControllingVariants(props)
    const isVariantNode = checkIsVariantNode(props)

    if (
        context &&
        isVariantNode &&
        !isControllingVariants &&
        props.inherit !== false
    ) {
        if (initial === undefined) initial = context.initial
        if (animate === undefined) animate = context.animate
    }

    let isInitialAnimationBlocked = presenceContext
        ? presenceContext.initial === false
        : false
    isInitialAnimationBlocked = isInitialAnimationBlocked || initial === false

    const variantToSet = isInitialAnimationBlocked ? animate : initial

    if (
        variantToSet &&
        typeof variantToSet !== "boolean" &&
        !isAnimationControls(variantToSet)
    ) {
        const list = Array.isArray(variantToSet) ? variantToSet : [variantToSet]
        for (let i = 0; i < list.length; i++) {
            const resolved = resolveVariantFromProps(props, list[i] as any)
            if (resolved) {
                const { transitionEnd, transition, ...target } = resolved
                for (const key in target) {
                    let valueTarget = target[key as keyof typeof target]

                    if (Array.isArray(valueTarget)) {
                        /**
                         * Take final keyframe if the initial animation is blocked because
                         * we want to initialise at the end of that blocked animation.
                         */
                        const index = isInitialAnimationBlocked
                            ? valueTarget.length - 1
                            : 0
                        valueTarget = valueTarget[index] as any
                    }

                    if (valueTarget !== null) {
                        values[key] = valueTarget as AnyResolvedKeyframe
                    }
                }
                for (const key in transitionEnd) {
                    values[key] = transitionEnd[
                        key as keyof typeof transitionEnd
                    ] as AnyResolvedKeyframe
                }
            }
        }
    }

    return values
}

export const makeUseVisualState =
    <I, RS>(config: UseVisualStateConfig<RS>): MakeVisualState<I, RS> =>
    (props, context, presenceContext): VisualState<I, RS> =>
        makeState(config, props, context, presenceContext)
