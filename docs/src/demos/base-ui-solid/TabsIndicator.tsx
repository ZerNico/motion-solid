import { motion } from "@motion-s/solid"
import { Tabs } from "base-ui-solid/tabs"
import { createSignal, For, Show } from "solid-js"

const tabs = ["Overview", "Projects", "Account"]

export default function TabsIndicator() {
  const [value, setValue] = createSignal(tabs[0])

  return (
    <Tabs.Root value={value()} onValueChange={setValue}>
      <Tabs.List class="flex gap-1 rounded-full bg-bg p-1 text-sm">
        <For each={tabs}>
          {(tab) => (
            <Tabs.Tab
              value={tab}
              class="relative rounded-full px-4 py-1.5 outline-none"
            >
              <Show when={value() === tab}>
                <motion.span
                  layoutId="tab-highlight"
                  class="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: "spring", bounce: 0.2 }}
                />
              </Show>
              <span class={["relative", value() === tab && "text-white"]}>
                {tab}
              </span>
            </Tabs.Tab>
          )}
        </For>
      </Tabs.List>
    </Tabs.Root>
  )
}
