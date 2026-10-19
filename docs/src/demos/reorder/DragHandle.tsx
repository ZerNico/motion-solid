import { Reorder, useDragControls } from "@motion-s/solid"
import { createSignal, For } from "solid-js"

function Item(props: { value: string }) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={props.value}
      dragListener={false}
      dragControls={controls}
      class="flex items-center justify-between rounded-lg bg-bg px-4 py-3 text-sm"
    >
      {props.value}
      <span
        class="cursor-grab touch-none px-1 text-fg-muted select-none active:cursor-grabbing"
        aria-hidden="true"
        onPointerDown={(event) => controls.start(event)}
      >
        ⠿
      </span>
    </Reorder.Item>
  )
}

export default function DragHandle() {
  const [items, setItems] = createSignal(["First", "Second", "Third", "Fourth"])

  return (
    <Reorder.Group
      values={items()}
      onReorder={setItems}
      class="flex w-64 flex-col gap-2"
    >
      <For each={items()}>{(item) => <Item value={item} />}</For>
    </Reorder.Group>
  )
}
