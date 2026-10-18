import { rootProjectionNode } from "motion-dom"

export function useResetProjection() {
    return () => {
        const root = rootProjectionNode.current
        if (!root) return
        root.resetTree()
    }
}
