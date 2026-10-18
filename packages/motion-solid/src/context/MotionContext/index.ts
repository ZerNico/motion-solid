import type { VisualElement } from "motion-dom"
import { createContext } from "solid-js"

/**
 * Port note: `initial` and `animate` are getters, so variant labels inherited from a parent stay
 * reactive (React re-renders the subtree instead).
 */
export interface MotionContextProps<Instance = unknown> {
    visualElement?: VisualElement<Instance>
    initial?: false | string | string[]
    animate?: string | string[]
}

export const MotionContext = /* @__PURE__ */ createContext<MotionContextProps>(
    {}
)
