import { motion, useSpring, useTransform } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function Counter() {
  const [count, setCount] = createSignal(0)
  const value = useSpring(count, { visualDuration: 0.6, bounce: 0 })
  const display = useTransform(() => Math.round(value.get()))
  const width = useTransform(value, [0, 1000], ["0%", "100%"])

  const button = "rounded-full border border-border bg-bg px-4 py-2 text-sm"

  return (
    <div class="flex w-72 flex-col items-center gap-5">
      <motion.span class="font-mono text-5xl tabular-nums">
        {display}
      </motion.span>
      <div class="h-2 w-full overflow-hidden rounded-full bg-bg">
        <motion.div class="h-full bg-accent" style={{ width }} />
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class={button}
          onClick={() => setCount((n) => Math.max(0, n - 250))}
        >
          − 250
        </button>
        <button
          type="button"
          class={button}
          onClick={() => setCount((n) => Math.min(1000, n + 250))}
        >
          + 250
        </button>
      </div>
    </div>
  )
}
