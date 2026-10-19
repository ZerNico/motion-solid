import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function Shadow() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const shadowX = useTransform(x, [-100, 100], [24, -24])
  const shadowY = useTransform(y, [-50, 50], [24, -24])
  const [blur, setBlur] = createSignal(16)

  const boxShadow = useMotionTemplate`${shadowX}px ${shadowY}px ${blur}px rgb(79 107 255 / 0.5)`

  return (
    <div class="flex flex-col items-center gap-6">
      <motion.div
        class="size-20 cursor-grab rounded-2xl border border-border bg-bg active:cursor-grabbing"
        drag
        dragConstraints={{
          left: -100,
          right: 100,
          top: -50,
          bottom: 50,
        }}
        style={{ x, y, boxShadow }}
      />
      <label class="flex items-center gap-3 text-sm text-fg-muted">
        Blur
        <input
          type="range"
          min="0"
          max="40"
          value={blur()}
          class="accent-accent"
          onInput={(event) => setBlur(event.currentTarget.valueAsNumber)}
        />
      </label>
    </div>
  )
}
