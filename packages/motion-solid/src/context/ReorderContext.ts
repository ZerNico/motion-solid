import { createContext } from "solid-js"
import type { ReorderContextProps } from "../components/Reorder/types"

export const ReorderContext = createContext<ReorderContextProps<any> | null>(
    null
)
