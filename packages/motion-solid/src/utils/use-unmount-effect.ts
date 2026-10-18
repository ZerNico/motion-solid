import { onCleanup } from "solid-js"

export function useUnmountEffect(callback: () => void) {
    onCleanup(callback)
}
