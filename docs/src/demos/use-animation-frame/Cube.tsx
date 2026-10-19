import { useAnimationFrame } from "@motion-s/solid"
import { createSignal, For } from "solid-js"

const faces = [
  "rotateY(0deg)",
  "rotateY(90deg)",
  "rotateY(180deg)",
  "rotateY(-90deg)",
  "rotateX(90deg)",
  "rotateX(-90deg)",
]

export default function Cube() {
  let cube!: HTMLDivElement
  let angle = 0
  const [paused, setPaused] = createSignal(false)

  useAnimationFrame((_time, delta) => {
    if (paused()) return
    // 60 degrees per second, whatever the frame rate.
    angle += (delta / 1000) * 60
    cube.style.transform = `rotateX(${angle * 0.7}deg) rotateY(${angle}deg)`
  })

  return (
    <div class="flex flex-col items-center gap-8">
      <div class="size-20 [perspective:600px]">
        <div
          ref={cube}
          class="relative size-full [transform-style:preserve-3d]"
        >
          <For each={faces}>
            {(face) => (
              <div
                class="absolute inset-0 rounded-lg border border-white/40 bg-accent/70"
                style={{
                  transform: `${face} translateZ(40px)`,
                }}
              />
            )}
          </For>
        </div>
      </div>
      <button
        type="button"
        class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
        onClick={() => setPaused((value) => !value)}
      >
        {paused() ? "Play" : "Pause"}
      </button>
    </div>
  )
}
