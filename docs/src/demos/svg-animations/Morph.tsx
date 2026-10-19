import { motion } from "@motion-s/solid"
import { createSignal } from "solid-js"

// Both icons are two shapes of four points, in the same order, so every number can animate
// to its counterpart.
const play =
  "M8 5 L13.5 8.5 L13.5 15.5 L8 19 Z M13.5 8.5 L19 12 L19 12 L13.5 15.5 Z"
const pause = "M7 5 L10.5 5 L10.5 19 L7 19 Z M13.5 5 L17 5 L17 19 L13.5 19 Z"

export default function Morph() {
  const [isPlaying, setIsPlaying] = createSignal(false)

  return (
    <button
      type="button"
      class="flex size-20 items-center justify-center rounded-full bg-accent text-white"
      aria-label={isPlaying() ? "Pause" : "Play"}
      onClick={() => setIsPlaying((playing) => !playing)}
    >
      <svg viewBox="0 0 24 24" class="size-10" fill="currentColor">
        <motion.path
          initial={false}
          animate={{ d: isPlaying() ? pause : play }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
      </svg>
    </button>
  )
}
