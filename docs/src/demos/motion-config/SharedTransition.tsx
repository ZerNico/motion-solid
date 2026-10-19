import { motion, MotionConfig, type Transition } from "@motion-s/solid"
import { createSignal, For } from "solid-js"

const presets: Record<string, Transition> = {
  Spring: { type: "spring", bounce: 0 },
  Bouncy: { type: "spring", bounce: 0.5, duration: 0.8 },
  Slow: { duration: 1.2, ease: "easeInOut" },
}

export default function SharedTransition() {
  const [preset, setPreset] = createSignal("Spring")
  const [isRight, setIsRight] = createSignal(false)

  return (
    <div class="flex flex-col items-center gap-6">
      <div class="flex gap-1 rounded-full border border-border bg-bg p-1 text-sm">
        <For each={Object.keys(presets)}>
          {(name) => (
            <button
              type="button"
              class={[
                "rounded-full px-3 py-1",
                preset() === name && "bg-accent text-white",
              ]}
              aria-pressed={preset() === name ? "true" : "false"}
              onClick={() => setPreset(name)}
            >
              {name}
            </button>
          )}
        </For>
      </div>
      <MotionConfig transition={presets[preset()]}>
        <div class="flex w-64 flex-col gap-2">
          <For each={[0, 1, 2]}>
            {(row) => (
              <motion.div
                class="size-8 rounded-lg bg-accent"
                animate={{ x: isRight() ? 224 : 0 }}
                style={{ opacity: 1 - row * 0.25 }}
              />
            )}
          </For>
        </div>
      </MotionConfig>
      <button
        type="button"
        class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
        onClick={() => setIsRight((right) => !right)}
      >
        Move
      </button>
    </div>
  )
}
