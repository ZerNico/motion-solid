import { LayoutGroup, motion } from "@motion-s/solid"
import { createSignal, For, Show } from "solid-js"

function Tabs(props: { tabs: string[] }) {
  const [selected, setSelected] = createSignal(props.tabs[0])

  return (
    <div class="flex gap-1 rounded-full bg-bg p-1">
      <For each={props.tabs}>
        {(tab) => (
          <button
            type="button"
            class={[
              "relative rounded-full px-4 py-2 text-sm",
              selected() === tab ? "text-white" : "text-fg-muted",
            ]}
            onClick={() => setSelected(tab)}
          >
            <Show when={selected() === tab}>
              {/* The same layoutId in every Tabs: LayoutGroup's id keeps them apart */}
              <motion.span
                layoutId="highlight"
                class="absolute inset-0 bg-accent"
                style={{ borderRadius: 9999 }}
                transition={{
                  type: "spring",
                  bounce: 0.2,
                  duration: 0.5,
                }}
              />
            </Show>
            <span class="relative">{tab}</span>
          </button>
        )}
      </For>
    </div>
  )
}

export default function TabBars() {
  return (
    <div class="flex flex-col items-center gap-4">
      <LayoutGroup id="sizes">
        <Tabs tabs={["Small", "Medium", "Large"]} />
      </LayoutGroup>
      <LayoutGroup id="themes">
        <Tabs tabs={["Light", "Dark", "System"]} />
      </LayoutGroup>
    </div>
  )
}
