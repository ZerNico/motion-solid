import { motion } from "@motion-s/solid"
import { createSignal, For, Show } from "solid-js"

const tabs = ["Overview", "Usage", "API"]

export default function SharedTabs() {
  const [selected, setSelected] = createSignal(tabs[0])

  return (
    <div class="flex gap-1 rounded-full bg-bg p-1" role="tablist">
      <For each={tabs}>
        {(tab) => (
          <button
            type="button"
            role="tab"
            aria-selected={selected() === tab ? "true" : "false"}
            class={[
              "relative rounded-full px-4 py-2 text-sm",
              selected() === tab ? "text-white" : "text-fg-muted",
            ]}
            onClick={() => setSelected(tab)}
          >
            <Show when={selected() === tab}>
              <motion.span
                layoutId="tab-highlight"
                class="absolute inset-0 rounded-full bg-accent"
                style={{ borderRadius: 9999 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            </Show>
            <span class="relative">{tab}</span>
          </button>
        )}
      </For>
    </div>
  )
}
