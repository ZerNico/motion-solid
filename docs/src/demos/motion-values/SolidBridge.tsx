import { motion, useMotionValueState, useSpring } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function SolidBridge() {
  // Solid → motion value: the spring follows the signal.
  const [target, setTarget] = createSignal(0)
  const x = useSpring(target, { stiffness: 120, damping: 14 })

  // Motion value → Solid: an accessor for logic and text.
  const latest = useMotionValueState(x)

  return (
    <div class="flex w-72 flex-col gap-6">
      <div class="relative h-12 rounded-xl bg-bg">
        <div class="absolute inset-y-0 left-[224px] w-px bg-border" />
        <motion.div class="size-12 rounded-xl bg-accent" style={{ x }} />
      </div>
      <input
        type="range"
        min="0"
        max="240"
        value={target()}
        aria-label="Target"
        class="accent-accent"
        onInput={(event) => setTarget(event.currentTarget.valueAsNumber)}
      />
      <p class="text-sm text-fg-muted">
        {latest() > 200 ? "Past the line" : "Before the line"}
      </p>
    </div>
  )
}
