import type { IProjectionNode, VisualElement } from "motion-dom"
import type { InitialPromotionConfig } from "../../context/SwitchLayoutGroupContext"
import { isRefObject } from "../../utils/is-ref-object"
import type { MotionProps } from "../types"

/**
 * Port note: upstream's `useVisualElement` hook creates the `VisualElement` and drives its
 * lifecycle from React effects. In Solid that lives in `createMotionComponent` (`motion/index.tsx`),
 * this module keeps the parts that don't depend on the framework.
 */
export function createProjectionNode(
    visualElement: VisualElement<any>,
    props: MotionProps,
    ProjectionNodeConstructor: any,
    initialPromotionConfig?: InitialPromotionConfig
) {
    const {
        layoutId,
        layout,
        drag,
        dragConstraints,
        layoutScroll,
        layoutRoot,
        layoutAnchor,
        layoutCrossfade,
    } = props

    visualElement.projection = new ProjectionNodeConstructor(
        visualElement.latestValues,
        props["data-framer-portal-id" as keyof MotionProps]
            ? undefined
            : getClosestProjectingNode(visualElement.parent)
    ) as IProjectionNode

    visualElement.projection.setOptions({
        layoutId,
        layout,
        alwaysMeasureLayout:
            Boolean(drag) || (dragConstraints && isRefObject(dragConstraints)),
        visualElement,
        /**
         * TODO: Update options in an effect. This could be tricky as it'll be too late
         * to update by the time layout animations run.
         * We also need to fix this safeToRemove by linking it up to the one returned by usePresence,
         * ensuring it gets called if there's no potential layout animations.
         *
         */
        animationType: typeof layout === "string" ? layout : "both",
        initialPromotionConfig,
        crossfade: layoutCrossfade,
        layoutScroll,
        layoutRoot,
        layoutAnchor,
    })
}

function getClosestProjectingNode(
    visualElement?: VisualElement<
        unknown,
        unknown,
        { allowProjection?: boolean }
    >
): IProjectionNode | undefined {
    if (!visualElement) return undefined

    return visualElement.options.allowProjection !== false
        ? visualElement.projection
        : getClosestProjectingNode(visualElement.parent)
}
