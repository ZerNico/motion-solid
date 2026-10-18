import type { JSX } from "@solidjs/web"
import type { Component } from "solid-js"
import {
    createMotionComponent,
    type MotionComponent,
    type MotionComponentOptions,
} from "../../motion"
import type { FeaturePackages } from "../../motion/features/types"
import type { DOMMotionComponents } from "../dom/types"
import type { CreateVisualElement } from "../types"

export interface CreateMotionComponent {
    <TagName extends keyof JSX.IntrinsicElements>(
        Component: TagName,
        options?: MotionComponentOptions
    ): DOMMotionComponents[TagName]
    <Props extends Record<string, any> = {}>(
        Component: string | Component<Props>,
        options?: MotionComponentOptions
    ): MotionComponent<Props>
}

export type MotionProxy = DOMMotionComponents & {
    create: CreateMotionComponent
}

/**
 * Port note: the deprecated `motion(Component)` call form isn't ported, use `motion.create()`.
 */
export function createMotionProxy(
    preloadedFeatures?: FeaturePackages,
    createVisualElement?: CreateVisualElement
): MotionProxy {
    /**
     * A cache of generated `motion` components, e.g `motion.div`, `motion.input` etc.
     * Rather than generating them anew every render.
     */
    const componentCache = new Map<string, any>()

    const factory = (<Props extends Record<string, any> = {}>(
        Component: string | Component<Props>,
        options?: MotionComponentOptions
    ) => {
        return createMotionComponent(
            Component,
            options,
            preloadedFeatures,
            createVisualElement
        )
    }) as CreateMotionComponent

    return new Proxy({} as MotionProxy, {
        /**
         * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
         * The prop name is passed through as `key` and we can use that to generate a `motion`
         * DOM component with that name.
         */
        get: (_target, key: string) => {
            if (key === "create") return factory

            /**
             * If this element doesn't exist in the component cache, create it and cache.
             */
            if (!componentCache.has(key)) {
                componentCache.set(
                    key,
                    createMotionComponent(
                        key,
                        undefined,
                        preloadedFeatures,
                        createVisualElement
                    )
                )
            }

            return componentCache.get(key)!
        },
    })
}
