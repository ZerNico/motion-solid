import { createContext, type Accessor } from "solid-js"
import type { CreateVisualElement } from "../render/types"

/**
 * Port note: `renderer` is an accessor: with a lazy bundle, it's set once the features have
 * loaded (upstream re-renders the subtree instead).
 */
export interface LazyContextProps {
    renderer: Accessor<CreateVisualElement | undefined>
    strict: boolean
}

export const LazyContext = createContext<LazyContextProps>({
    renderer: () => undefined,
    strict: false,
})
