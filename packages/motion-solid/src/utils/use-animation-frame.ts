import { cancelFrame, frame, type FrameData } from "motion-dom"
import { onCleanup, useContext } from "solid-js"
import { MotionConfigContext } from "../context/MotionConfigContext"

export type FrameCallback = (timestamp: number, delta: number) => void

/**
 * Runs `callback` once every animation frame, with the time since the first frame.
 *
 * @public
 */
export function useAnimationFrame(callback: FrameCallback) {
    let initialTimestamp = 0
    const { isStatic } = useContext(MotionConfigContext)
    if (isStatic) return

    const provideTimeSinceStart = ({ timestamp, delta }: FrameData) => {
        if (!initialTimestamp) initialTimestamp = timestamp

        callback(timestamp - initialTimestamp, delta)
    }

    frame.update(provideTimeSinceStart, true)
    onCleanup(() => cancelFrame(provideTimeSinceStart))
}
