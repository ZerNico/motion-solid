import { animate, type AnimationPlaybackControls } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function Counter() {
  const [count, setCount] = createSignal(0)
  let controls: AnimationPlaybackControls | undefined

  function countTo(target: number) {
    controls?.stop()
    controls = animate(count(), target, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (latest) => setCount(Math.round(latest)),
    })
  }

  return (
    <div class="flex flex-col items-center gap-6">
      <p class="text-5xl font-semibold tabular-nums">
        {count().toLocaleString("en-US")}
      </p>
      <div class="flex gap-2 text-sm">
        <button
          type="button"
          class="rounded-full border border-border bg-bg px-4 py-2"
          onClick={() => countTo(count() + 1000)}
        >
          Add 1,000
        </button>
        <button
          type="button"
          class="rounded-full border border-border bg-bg px-4 py-2"
          onClick={() => countTo(0)}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
