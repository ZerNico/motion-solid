import {
  animate,
  motion,
  useMotionValue,
  useMotionValueState,
  useMotionValueEvent,
} from "@motion-s/solid"
import { createSignal, For } from "solid-js"

type Entry = { id: number; name: string }
let nextId = 0

export default function EventLog() {
  const x = useMotionValue(0)
  const latest = useMotionValueState(x)
  const [log, setLog] = createSignal<Entry[]>([])

  const record = (name: string) => () =>
    setLog((entries) => [{ id: nextId++, name }, ...entries].slice(0, 4))

  useMotionValueEvent(x, "animationStart", record("animationStart"))
  useMotionValueEvent(x, "animationComplete", record("animationComplete"))
  useMotionValueEvent(x, "animationCancel", record("animationCancel"))

  const move = () => {
    const target = x.get() > 0 ? -100 : 100
    animate(x, target, { duration: 1.2, ease: "easeInOut" })
  }

  return (
    <div class="flex w-80 flex-col items-center gap-4">
      <div class="flex h-16 w-full items-center justify-center rounded-full bg-bg">
        <motion.div class="size-10 rounded-xl bg-accent" style={{ x }} />
      </div>
      <div class="flex w-full items-center justify-between text-sm">
        <span class="font-mono text-fg-muted">x: {Math.round(latest())}</span>
        <button
          type="button"
          class="rounded-full border border-border bg-bg px-4 py-2"
          onClick={move}
        >
          Move
        </button>
      </div>
      <ul class="h-24 w-full font-mono text-xs text-fg-muted">
        <For each={log()}>{(entry) => <li>{entry.name}</li>}</For>
      </ul>
    </div>
  )
}
