import type { NodeGroup } from "motion-dom"
import { createContext } from "solid-js"

export interface LayoutGroupContextProps {
    id?: string
    group?: NodeGroup
    forceRender?: VoidFunction
}

export const LayoutGroupContext = createContext<LayoutGroupContextProps>({})
