import { animate, type AnimationPlaybackControls } from "@motion-s/solid"
import { createSignal, For, onSettled } from "solid-js"

const speeds = [0.5, 1, 2]

export default function Controls() {
  let box!: HTMLDivElement
  let controls: AnimationPlaybackControls | undefined
  const [isPlaying, setIsPlaying] = createSignal(true)
  const [speed, setSpeed] = createSignal(1)

  onSettled(() => {
    controls = animate(
      box,
      { x: [-96, 96], rotate: [0, 180] },
      {
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
      }
    )
    return () => controls?.stop()
  })

  function togglePlaying() {
    if (isPlaying()) controls?.pause()
    else controls?.play()
    setIsPlaying(!isPlaying())
  }

  function changeSpeed(value: number) {
    if (controls) controls.speed = value
    setSpeed(value)
  }

  return (
    <div class="flex flex-col items-center gap-8">
      <div ref={box} class="size-16 rounded-2xl bg-accent" />
      <div class="flex items-center gap-3 text-sm">
        <button
          type="button"
          class="w-20 rounded-full border border-border bg-bg px-4 py-2"
          onClick={togglePlaying}
        >
          {isPlaying() ? "Pause" : "Play"}
        </button>
        <div class="flex gap-1 rounded-full border border-border bg-bg p-1">
          <For each={speeds}>
            {(value) => (
              <button
                type="button"
                class={[
                  "rounded-full px-3 py-1",
                  speed() === value && "bg-accent text-white",
                ]}
                aria-pressed={speed() === value ? "true" : "false"}
                onClick={() => changeSpeed(value)}
              >
                {value}×
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}
