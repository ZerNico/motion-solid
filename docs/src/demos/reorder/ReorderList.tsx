import { Reorder } from "@motion-s/solid"
import { createSignal, For } from "solid-js"

export default function ReorderList() {
    const [items, setItems] = createSignal([
        "Apples",
        "Bread",
        "Coffee",
        "Dates",
    ])

    return (
        <Reorder.Group
            axis="y"
            values={items()}
            onReorder={setItems}
            class="flex w-64 flex-col gap-2"
        >
            <For each={items()}>
                {(item) => (
                    <Reorder.Item
                        value={item}
                        class="cursor-grab rounded-lg bg-bg px-4 py-3 text-sm select-none active:cursor-grabbing"
                        whileDrag={{
                            scale: 1.03,
                            boxShadow: "0 8px 24px rgb(0 0 0 / 0.15)",
                        }}
                    >
                        {item}
                    </Reorder.Item>
                )}
            </For>
        </Reorder.Group>
    )
}
