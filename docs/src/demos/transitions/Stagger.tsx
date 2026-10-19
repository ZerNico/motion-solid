import { motion, stagger, type StaggerOrigin } from "@motion-s/solid"
import { createSignal, For } from "solid-js"

const bars = Array.from({ length: 9 }, (_, index) => index)
const origins: StaggerOrigin[] = ["first", "center", "last"]

export default function Stagger() {
  const [isUp, setIsUp] = createSignal(true)
  const [from, setFrom] = createSignal<StaggerOrigin>("first")

  return (
    <div class="flex flex-col items-center gap-6">
      <motion.div
        class="flex h-24 items-end gap-2"
        initial="down"
        animate={isUp() ? "up" : "down"}
        transition={{ delayChildren: stagger(0.06, { from: from() }) }}
      >
        <For each={bars}>
          {() => (
            <motion.div
              class="h-24 w-4 origin-bottom rounded-full bg-accent"
              variants={{
                up: { scaleY: 1, opacity: 1 },
                down: { scaleY: 0.2, opacity: 0.4 },
              }}
              transition={{ type: "spring", bounce: 0.4 }}
            />
          )}
        </For>
      </motion.div>
      <div class="flex gap-2">
        <For each={origins}>
          {(origin) => (
            <button
              type="button"
              class={[
                "rounded-full border px-4 py-2 text-sm",
                from() === origin
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-bg",
              ]}
              onClick={() => {
                setFrom(origin)
                setIsUp((up) => !up)
              }}
            >
              {origin}
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
