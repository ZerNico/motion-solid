import { motion } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function Transforms() {
  const [x, setX] = createSignal(0)
  const [rotate, setRotate] = createSignal(0)
  const [scale, setScale] = createSignal(1)

  return (
    <div class="flex items-center gap-12">
      <div class="flex size-40 items-center justify-center">
        <motion.div
          class="size-20 rounded-2xl bg-accent"
          animate={{ x: x(), rotate: rotate(), scale: scale() }}
          transition={{
            type: "spring",
            visualDuration: 0.3,
            bounce: 0.3,
          }}
        />
      </div>
      <div class="flex w-48 flex-col gap-3 text-sm">
        <label class="flex flex-col gap-1">
          <span class="text-fg-muted">x: {x()}px</span>
          <input
            type="range"
            min="-50"
            max="50"
            value={x()}
            onInput={(event) => setX(event.currentTarget.valueAsNumber)}
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-fg-muted">rotate: {rotate()}deg</span>
          <input
            type="range"
            min="-180"
            max="180"
            value={rotate()}
            onInput={(event) => setRotate(event.currentTarget.valueAsNumber)}
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-fg-muted">scale: {scale()}</span>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={scale()}
            onInput={(event) => setScale(event.currentTarget.valueAsNumber)}
          />
        </label>
      </div>
    </div>
  )
}
