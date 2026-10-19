import { isServer } from "@solidjs/web"
import { createSignal, untrack } from "solid-js"
import { LazyContext } from "../../context/LazyContext"
import { loadFeatures } from "../../motion/features/load-features"
import type {
    FeatureBundle,
    LazyFeatureBundle,
} from "../../motion/features/types"
import type { CreateVisualElement } from "../../render/types"
import type { LazyProps } from "./types"

/**
 * Used in conjunction with the `m` component to reduce bundle size.
 *
 * `m` is a version of the `motion` component that only loads functionality
 * critical for the initial render.
 *
 * `LazyMotion` can then be used to either synchronously or asynchronously
 * load animation and gesture support.
 *
 * ```jsx
 * // Synchronous loading
 * import { LazyMotion, m, domAnimation } from "@motion-s/solid"
 *
 * function App() {
 *   return (
 *     <LazyMotion features={domAnimation}>
 *       <m.div animate={{ scale: 2 }} />
 *     </LazyMotion>
 *   )
 * }
 *
 * // Asynchronous loading
 * import { LazyMotion, m } from "@motion-s/solid"
 *
 * function App() {
 *   return (
 *     <LazyMotion features={() => import("./path/to/domAnimation")}>
 *       <m.div animate={{ scale: 2 }} />
 *     </LazyMotion>
 *   )
 * }
 * ```
 *
 * Port note: the `features` and `strict` props are read once.
 *
 * @public
 */
export function LazyMotion(props: LazyProps) {
    const features = untrack(() => props.features)
    const [loadedRenderer, setLoadedRenderer] = createSignal<
        CreateVisualElement | undefined
    >(undefined, {
        name:
            process.env.NODE_ENV !== "production"
                ? "Motion.LazyMotion.renderer"
                : undefined,
    })

    let renderer: () => CreateVisualElement | undefined

    if (!isLazyBundle(features)) {
        const { renderer: syncRenderer, ...loadedFeatures } = features
        loadFeatures(loadedFeatures)
        renderer = () => syncRenderer
    } else {
        /**
         * Port note: upstream loads lazy features in an effect, which doesn't run on the server.
         * Here they're loaded right away, so the server skips them: `m` components render
         * without a `VisualElement` there anyway, and writing a signal on the server warns.
         */
        if (!isServer) {
            features().then(({ renderer: lazyRenderer, ...loadedFeatures }) => {
                loadFeatures(loadedFeatures)
                setLoadedRenderer(() => lazyRenderer)
            })
        }
        renderer = loadedRenderer
    }

    return (
        <LazyContext
            value={{ renderer, strict: untrack(() => props.strict) ?? false }}
        >
            {props.children}
        </LazyContext>
    )
}

function isLazyBundle(
    features: FeatureBundle | LazyFeatureBundle
): features is LazyFeatureBundle {
    return typeof features === "function"
}
