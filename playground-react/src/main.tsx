import { AnimatePresence, LayoutGroup, motion, Reorder } from "motion/react"
import { useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"

/**
 * The same demos as the Solid playground (`playground/src/main.tsx`), with motion/react, to
 * compare their behaviour side by side.
 */

function PresenceDemo() {
    const [open, setOpen] = useState(true)

    return (
        <section>
            <h2>Presence</h2>
            <button onClick={() => setOpen((value) => !value)}>Toggle</button>
            <div className="stage">
                <AnimatePresence>
                    {open && (
                        <motion.div
                            key="card"
                            className="card"
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        />
                    )}
                </AnimatePresence>
            </div>
        </section>
    )
}

function ListDemo() {
    const next = useRef(4)
    const [items, setItems] = useState([1, 2, 3])

    const add = () => {
        const index = Math.floor(Math.random() * (items.length + 1))
        const copy = [...items]
        copy.splice(index, 0, next.current++)
        setItems(copy)
    }
    const remove = (item: number) =>
        setItems(items.filter((other) => other !== item))
    const shuffle = () => setItems([...items].sort(() => Math.random() - 0.5))

    return (
        <section>
            <h2>List (AnimatePresence + layout, popLayout)</h2>
            <button onClick={add}>Add</button>
            <button onClick={shuffle}>Shuffle</button>
            <ul className="list">
                <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                        <motion.li
                            key={item}
                            layout
                            initial={{ opacity: 0, x: -40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 40 }}
                            onClick={() => remove(item)}
                        >
                            Item {item} (click to remove)
                        </motion.li>
                    ))}
                </AnimatePresence>
            </ul>
        </section>
    )
}

function SwitchDemo() {
    const [on, setOn] = useState(false)

    return (
        <section>
            <h2>Toggle (layout + layoutDependency)</h2>
            <div
                className="switch"
                style={{ justifyContent: on ? "flex-end" : "flex-start" }}
                onClick={() => setOn((value) => !value)}
            >
                <motion.div
                    className="handle"
                    layout
                    layoutDependency={on}
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                />
            </div>
        </section>
    )
}

function TabsDemo() {
    const tabs = ["Home", "Profile", "Settings"]
    const [selected, setSelected] = useState(tabs[0])

    return (
        <section>
            <h2>Tabs (shared layoutId)</h2>
            <LayoutGroup>
                <nav className="tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            className="tab"
                            onClick={() => setSelected(tab)}
                        >
                            {tab}
                            {selected === tab && (
                                <motion.div
                                    className="underline"
                                    layoutId="underline"
                                />
                            )}
                        </button>
                    ))}
                </nav>
            </LayoutGroup>
        </section>
    )
}

function ExpandDemo() {
    const [expanded, setExpanded] = useState(false)

    return (
        <section>
            <h2>Expand (layout on own size)</h2>
            <motion.div
                layout
                className="expand"
                style={{ height: expanded ? 200 : 60, borderRadius: 16 }}
                onClick={() => setExpanded((value) => !value)}
            >
                <motion.p layout="position">Click me</motion.p>
            </motion.div>
        </section>
    )
}

function SwapDemo() {
    const [key, setKey] = useState(0)
    const colors = ["#ff0088", "#0d63f8", "#22cc88"]
    const value = key + 1

    return (
        <section>
            <h2>mode="wait"</h2>
            <button onClick={() => setKey((current) => current + 1)}>
                Next
            </button>
            <div className="stage">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={value}
                        className="card"
                        style={{
                            backgroundColor: colors[value % colors.length],
                        }}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.25 }}
                    />
                </AnimatePresence>
            </div>
        </section>
    )
}

function DragDemo() {
    const area = useRef<HTMLDivElement>(null)

    return (
        <section>
            <h2>Drag (constraints)</h2>
            <div className="drag-area" ref={area}>
                <motion.div
                    className="drag-box"
                    drag
                    dragConstraints={area}
                    whileDrag={{ scale: 1.1 }}
                />
            </div>
        </section>
    )
}

function ReorderDemo() {
    const [items, setItems] = useState([
        "🍅 Tomato",
        "🥒 Cucumber",
        "🧀 Cheese",
        "🥬 Lettuce",
    ])

    return (
        <section>
            <h2>Reorder</h2>
            <Reorder.Group className="list" values={items} onReorder={setItems}>
                {items.map((item) => (
                    <Reorder.Item key={item} value={item}>
                        {item}
                    </Reorder.Item>
                ))}
            </Reorder.Group>
        </section>
    )
}

function App() {
    return (
        <main>
            <h1>motion/react playground</h1>
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

createRoot(document.getElementById("root")!).render(<App />)
