import { AnimatePresence, For, motion } from "@motion-s/solid"
import { createSignal } from "solid-js"

let nextId = 4

export default function ForList() {
    const [items, setItems] = createSignal([1, 2, 3])

    return (
        <div class="flex w-64 flex-col gap-4">
            <button
                type="button"
                class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                onClick={() => setItems((items) => [...items, nextId++])}
            >
                Add item
            </button>
            <ul class="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                    <For each={items()}>
                        {(item) => (
                            <motion.li
                                layout
                                class="flex items-center justify-between rounded-lg bg-bg px-4 py-2 text-sm"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                Item {item}
                                <button
                                    type="button"
                                    class="text-fg-muted hover:text-fg"
                                    aria-label={`Remove item ${item}`}
                                    onClick={() =>
                                        setItems((items) =>
                                            items.filter((i) => i !== item)
                                        )
                                    }
                                >
                                    ✕
                                </button>
                            </motion.li>
                        )}
                    </For>
                </AnimatePresence>
            </ul>
        </div>
    )
}
