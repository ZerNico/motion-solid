import { render } from "@solidjs/web"
import {
    AnimatePresence,
    For,
    LayoutGroup,
    motion,
    Reorder,
    Show,
} from "@motion-s/solid"
import { createSignal } from "solid-js"
import "./styles.css"

function PresenceDemo() {
    const [open, setOpen] = createSignal(true)

    return (
        <section>
            <h2>Presence</h2>
            <button onClick={() => setOpen((value) => !value)}>Toggle</button>
            <div class="stage">
                <AnimatePresence>
                    <Show when={open()}>
                        <motion.div
                            class="card"
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        />
                    </Show>
                </AnimatePresence>
            </div>
        </section>
    )
}

function ListDemo() {
    let next = 4
    const [items, setItems] = createSignal([1, 2, 3])

    const add = () => {
        const index = Math.floor(Math.random() * (items().length + 1))
        const copy = [...items()]
        copy.splice(index, 0, next++)
        setItems(copy)
    }
    const remove = (item: number) =>
        setItems(items().filter((other) => other !== item))
    const shuffle = () => setItems([...items()].sort(() => Math.random() - 0.5))

    return (
        <section>
            <h2>List (AnimatePresence + layout, popLayout)</h2>
            <button onClick={add}>Add</button>
            <button onClick={shuffle}>Shuffle</button>
            <ul class="list">
                <AnimatePresence mode="popLayout">
                    <For each={items()}>
                        {(item) => (
                            <motion.li
                                layout
                                initial={{ opacity: 0, x: -40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 40 }}
                                onClick={() => remove(item)}
                            >
                                Item {item} (click to remove)
                            </motion.li>
                        )}
                    </For>
                </AnimatePresence>
            </ul>
        </section>
    )
}

function SwitchDemo() {
    const [on, setOn] = createSignal(false)

    return (
        <section>
            <h2>Toggle (layout + layoutDependency)</h2>
            <div
                class="switch"
                style={{ "justify-content": on() ? "flex-end" : "flex-start" }}
                onClick={() => setOn((value) => !value)}
            >
                <motion.div
                    class="handle"
                    layout
                    layoutDependency={on()}
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                />
            </div>
        </section>
    )
}

function TabsDemo() {
    const tabs = ["Home", "Profile", "Settings"]
    const [selected, setSelected] = createSignal(tabs[0])

    return (
        <section>
            <h2>Tabs (shared layoutId)</h2>
            <LayoutGroup>
                <nav class="tabs">
                    <For each={tabs}>
                        {(tab) => (
                            <button
                                class="tab"
                                onClick={() => setSelected(tab)}
                            >
                                {tab}
                                <Show when={selected() === tab}>
                                    <motion.div
                                        class="underline"
                                        layoutId="underline"
                                    />
                                </Show>
                            </button>
                        )}
                    </For>
                </nav>
            </LayoutGroup>
        </section>
    )
}

function ExpandDemo() {
    const [expanded, setExpanded] = createSignal(false)

    return (
        <section>
            <h2>Expand (layout on own size)</h2>
            <motion.div
                layout
                class="expand"
                style={{ height: expanded() ? 200 : 60, "border-radius": 16 }}
                onClick={() => setExpanded((value) => !value)}
            >
                <motion.p layout="position">Click me</motion.p>
            </motion.div>
        </section>
    )
}

function SwapDemo() {
    const [key, setKey] = createSignal(0)
    const colors = ["#ff0088", "#0d63f8", "#22cc88"]

    return (
        <section>
            <h2>mode="wait"</h2>
            <button onClick={() => setKey((value) => value + 1)}>Next</button>
            <div class="stage">
                <AnimatePresence mode="wait">
                    <Show when={key() + 1} keyed>
                        {(value) => (
                            <motion.div
                                class="card"
                                style={{
                                    "background-color":
                                        colors[value % colors.length],
                                }}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.25 }}
                            />
                        )}
                    </Show>
                </AnimatePresence>
            </div>
        </section>
    )
}

function DragDemo() {
    const [area, setArea] = createSignal<HTMLElement>()

    return (
        <section>
            <h2>Drag (constraints)</h2>
            <div class="drag-area" ref={setArea}>
                <motion.div
                    class="drag-box"
                    drag
                    dragConstraints={area}
                    whileDrag={{ scale: 1.1 }}
                />
            </div>
        </section>
    )
}

function ReorderDemo() {
    const [items, setItems] = createSignal([
        "🍅 Tomato",
        "🥒 Cucumber",
        "🧀 Cheese",
        "🥬 Lettuce",
    ])

    return (
        <section>
            <h2>Reorder</h2>
            <Reorder.Group class="list" values={items()} onReorder={setItems}>
                <For each={items()}>
                    {(item) => <Reorder.Item value={item}>{item}</Reorder.Item>}
                </For>
            </Reorder.Group>
        </section>
    )
}

function App() {
    return (
        <main>
            <h1>motion-solid playground</h1>
            <PresenceDemo />
            <ListDemo />
            <SwitchDemo />
            <TabsDemo />
            <ExpandDemo />
            <SwapDemo />
            <DragDemo />
            <ReorderDemo />
        </main>
    )
}

render(() => <App />, document.getElementById("root")!)
