import { LazyMotion, m } from "../../.."
import { domAnimation } from "../../../render/dom/features-animation"

/**
 * Counts the calls of the lazy `features` loader. In jsdom tests, the server render runs in the
 * test's process, so the test reads it.
 */
const counter = globalThis as { __lazyMotionServerLoads?: number }

export const LazyFeatures = () => (
    <LazyMotion
        features={() => {
            counter.__lazyMotionServerLoads =
                (counter.__lazyMotionServerLoads ?? 0) + 1
            return Promise.resolve(domAnimation)
        }}
    >
        <m.div initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} />
    </LazyMotion>
)
