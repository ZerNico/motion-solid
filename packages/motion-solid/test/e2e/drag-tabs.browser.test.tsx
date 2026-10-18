/**
 * Port of upstream's `cypress/integration/drag-tabs.ts` and its page,
 * `dev/react/src/tests/drag-tabs.tsx`.
 */
import { createEffect, createSignal } from "solid-js"
import {
    AnimatePresence,
    For,
    LayoutGroup,
    motion,
    MotionConfig,
    Reorder,
    Show,
} from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

function App() {
    const [tabs, setTabs] = createSignal(initialTabs)
    const [selectedTab, setSelectedTab] = createSignal<Ingredient | undefined>(
        initialTabs[0]
    )

    const remove = (item: Ingredient) => {
        if (item === selectedTab()) {
            setSelectedTab(closestItem(tabs(), item))
        }
        setTabs(removeItem(tabs(), item))
    }

    const add = () => {
        const nextItem = getNextIngredient(tabs())

        if (nextItem) {
            setTabs([...tabs(), nextItem])
            setSelectedTab(nextItem)
        }
    }

    // Automatically repopulate tabs when they all close
    createEffect(
        () => tabs().length,
        (length) => {
            if (!length) {
                const timer = setTimeout(() => {
                    setTabs(initialTabs)
                    setSelectedTab(initialTabs[0])
                }, 2000)

                return () => clearTimeout(timer)
            }
        }
    )

    return (
        <MotionConfig transition={{ duration: 0.1 }}>
            <div class="window">
                <nav>
                    <LayoutGroup>
                        <Reorder.Group
                            as="ul"
                            axis="x"
                            onReorder={setTabs}
                            class="tabs"
                            values={tabs()}
                        >
                            <AnimatePresence initial={false}>
                                <For each={tabs()}>
                                    {(item) => (
                                        <Item
                                            item={item}
                                            isSelected={selectedTab() === item}
                                            onClick={() => setSelectedTab(item)}
                                            onRemove={() => remove(item)}
                                        />
                                    )}
                                </For>
                            </AnimatePresence>
                        </Reorder.Group>
                        <motion.button
                            class="add-item"
                            onClick={add}
                            disabled={tabs().length === allIngredients.length}
                            whileTap={{ scale: 0.9 }}
                        >
                            <AddIcon />
                        </motion.button>
                    </LayoutGroup>
                </nav>
                <main>
                    <AnimatePresence mode="wait" initial={false}>
                        <Show
                            when={
                                selectedTab() ? selectedTab()!.label : "empty"
                            }
                            keyed
                        >
                            {(label: string) => (
                                <motion.div
                                    id={`${label}-content`}
                                    animate={{ opacity: 1, y: 0 }}
                                    initial={{ opacity: 0, y: 20 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {allIngredients.find(
                                        (ingredient) =>
                                            ingredient.label === label
                                    )?.icon ?? "😋"}
                                </motion.div>
                            )}
                        </Show>
                    </AnimatePresence>
                </main>
            </div>
            <style>{styles}</style>
        </MotionConfig>
    )
}

interface Props {
    item: Ingredient
    isSelected: boolean
    onClick: () => void
    onRemove: () => void
}

const Item = (props: Props) => {
    return (
        <Reorder.Item
            value={props.item}
            id={props.item.label + "-tab"}
            initial={{ opacity: 0, y: 30, transition: { duration: 0.15 } }}
            animate={{
                backgroundColor: props.isSelected ? "#f3f3f3" : "#fff",
                opacity: 1,
                y: 0,
                transition: { duration: 0.15 },
            }}
            exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }}
            whileDrag={{ backgroundColor: "#e3e3e3" }}
            class={["tab", { selected: props.isSelected }]}
            onPointerDown={() => props.onClick()}
            dragTransition={{ bounceStiffness: 10000, bounceDamping: 10000 }}
        >
            <motion.span
                layout="position"
                id={props.item.label + "-label"}
            >{`${props.item.icon} ${props.item.label}`}</motion.span>
            <motion.div layout class="close">
                <motion.button
                    id={props.item.label + "-remove"}
                    onPointerDown={(event) => {
                        event.stopPropagation()
                        props.onRemove()
                    }}
                    initial={false}
                    animate={{
                        backgroundColor: props.isSelected ? "#e3e3e3" : "#fff",
                    }}
                >
                    <CloseIcon />
                </motion.button>
            </motion.div>
        </Reorder.Item>
    )
}

function removeItem<T>([...arr]: T[], item: T) {
    const index = arr.indexOf(item)
    index > -1 && arr.splice(index, 1)
    return arr
}

function closestItem<T>(arr: T[], item: T) {
    const index = arr.indexOf(item)
    if (index === -1) {
        return arr[0]
    } else if (index === arr.length - 1) {
        return arr[arr.length - 2]
    } else {
        return arr[index + 1]
    }
}

function getNextIngredient(ingredients: Ingredient[]): Ingredient | undefined {
    const existing = new Set(ingredients)
    return allIngredients.find((ingredient) => !existing.has(ingredient))
}

interface Ingredient {
    icon: string
    label: string
}

const allIngredients = [
    { icon: "🍅", label: "Tomato" },
    { icon: "🥬", label: "Lettuce" },
    { icon: "🧀", label: "Cheese" },
    { icon: "🥕", label: "Carrot" },
    { icon: "🍌", label: "Banana" },
    { icon: "🫐", label: "Blueberries" },
    { icon: "🥂", label: "Champers?" },
]

const [tomato, lettuce, cheese] = allIngredients
const initialTabs = [tomato, lettuce, cheese]

function CloseIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            viewBox="0 0 20 20"
        >
            <path
                d="M 3 3 L 17 17"
                fill="transparent"
                stroke-width="3"
                stroke-linecap="round"
            ></path>
            <path
                d="M 17 3 L 3 17"
                fill="transparent"
                stroke-width="3"
                stroke-linecap="round"
            ></path>
        </svg>
    )
}
function AddIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            viewBox="0 0 20 20"
            style={{ transform: "rotate(45deg)", stroke: "black" }}
        >
            <path
                d="M 3 3 L 17 17"
                fill="transparent"
                stroke-width="3"
                stroke-linecap="round"
            ></path>
            <path
                d="M 17 3 L 3 17"
                fill="transparent"
                stroke-width="3"
                stroke-linecap="round"
            ></path>
        </svg>
    )
}

const styles = `
body {
  width: 100vw;
  height: 100vh;
  background: #ff0055;
  overflow: hidden;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.window {
  width: 480px;
  height: 360px;
  border-radius: 10px;
  background: white;
  overflow: hidden;
  box-shadow: 0 1px 1px hsl(0deg 0% 0% / 0.075),
    0 2px 2px hsl(0deg 0% 0% / 0.075), 0 4px 4px hsl(0deg 0% 0% / 0.075),
    0 8px 8px hsl(0deg 0% 0% / 0.075), 0 16px 16px hsl(0deg 0% 0% / 0.075);
  display: flex;
  flex-direction: column;
}

nav {
  background: #fdfdfd;
  padding: 5px 5px 0;
  border-radius: 10px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 1px solid #eeeeee;
  height: 44px;
  display: grid;
  grid-template-columns: 1fr 35px;
  max-width: 480px;
  overflow: hidden;
}

.tabs {
  flex-grow: 1;
  display: flex;
  justify-content: flex-start;
  align-items: flex-end;
  flex-wrap: nowrap;
  width: 420px;
  padding-right: 10px;
}

main {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 128px;
  flex-grow: 1;
  user-select: none;
}

ul,
li {
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: "Poppins", sans-serif;
  font-weight: 500;
  font-size: 14px;
}

li {
  border-radius: 5px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  width: 100%;
  padding: 10px 15px;
  position: relative;
  background: white;
  cursor: pointer;
  height: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  position: relative;
  user-select: none;
}

li span {
  color: black;
  flex-shrink: 1;
  flex-grow: 1;
  white-space: nowrap;
  display: block;
  min-width: 0;
  padding-right: 30px;
  mask-image: linear-gradient(to left, transparent 10px, #fff 30px);
  -webkit-mask-image: linear-gradient(to left, transparent 10px, #fff 30px);
}

li .close {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

li button {
  width: 20px;
  height: 20px;
  border: 0;
  background: #fff;
  border-radius: 3px;
  display: flex;
  justify-content: center;
  align-items: center;
  stroke: #000;
  margin-left: 10px;
  cursor: pointer;
  flex-shrink: 0;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 300px;
  background: #fff;
}

.add-item {
  width: 30px;
  height: 30px;
  background: #eee;
  border-radius: 50%;
  border: 0;
  cursor: pointer;
  align-self: center;
}

.add-item:disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

`

/**
 * Cypress' `.click()`: the pointer and mouse events of a click at the element's center.
 */
function click(element: Element) {
    trigger(element, "pointerdown")
    trigger(element, "mousedown")
    trigger(element, "pointerup")
    trigger(element, "mouseup")
    trigger(element, "click")
}

describe("Tabs demo", () => {
    it("Layout animations don't interfere with opacity", async () => {
        await visit(App)
        const button = query("button.add-item")
        await wait(50)
        click(button)
        await wait(100)
        await should(() => {
            expect(window.getComputedStyle(query("#Carrot-tab")).opacity).toBe(
                "1"
            )
        })
    })

    it("First tab doesn't distort when multiple layout animations started", async () => {
        await visit(App)
        await wait(50)
        await should(() => {
            const { left, right } =
                query("#Tomato-label").getBoundingClientRect()
            expect(left).toBe(280)
            expect(right).toBe(390)
        })
        const button = query("button.add-item")
        click(button)
        await wait(20)
        click(button)
        await wait(100)
        await should(() => {
            const { left, right } =
                query("#Tomato-label").getBoundingClientRect()
            expect(left).toBe(280)
            expect(right).toBe(334)
        })
    })

    it("Opacity finishes animating on reorder", async () => {
        await visit(App)
        const lettuce = query("#Lettuce-tab")
        await wait(50)
        click(lettuce)
        await nextFrame()
        await nextFrame()
        trigger(lettuce, "pointerdown", { x: 40, y: 10 })
        await wait(300)
        trigger(lettuce, "pointermove", { x: -40, y: 10, force: true }) // Gesture will start from first move past threshold
        await nextFrame()
        trigger(lettuce, "pointermove", { x: -100, y: 300, force: true })
        await nextFrame()
        await wait(50)
        trigger(lettuce, "pointerup", { force: true })
        await wait(200)
        await should(() => {
            expect(
                window.getComputedStyle(query("#Lettuce-content")).opacity
            ).toBe("1")
        })
        const tomato = query("#Tomato-tab")
        await wait(200)
        trigger(tomato, "pointerdown", { x: 40, y: 10 })
        trigger(tomato, "pointermove", { x: -40, y: 10, force: true }) // Gesture will start from first move past threshold
        await nextFrame()
        await wait(20)
        trigger(tomato, "pointermove", { x: -100, y: 300, force: true })
        await nextFrame()
        await wait(100)
        trigger(tomato, "pointerup", { force: true })
        await wait(350)
        await should(() => {
            const { left } = tomato.getBoundingClientRect()
            expect(left).toBe(265)
        })
        await should(() => {
            const { left } = query("#Tomato-label").getBoundingClientRect()
            expect(left).toBe(280)
        })
    })

    it("Double removing item doesn't break exit animation", async () => {
        await visit(App)
        await wait(50)
        const remove = query("#Lettuce-remove")
        click(remove)
        await wait(20)
        click(remove)
        await wait(400)
        await should(() => {
            const lettuce = query("nav").querySelectorAll("#Lettuce-tab")
            expect(lettuce.length).toBe(0)
        })
    })

    it("Removed tabs don't reappear on reorder", async () => {
        await visit(App)
        click(query("#Tomato-remove"))
        await wait(400)
        const lettuce = query("#Lettuce-tab")
        await nextFrame()
        await nextFrame()
        trigger(lettuce, "pointerdown", { x: 40, y: 10 })
        await wait(30)
        trigger(lettuce, "pointermove", { x: 50, y: 10, force: true }) // Gesture will start from first move past threshold
        await nextFrame()
        await wait(40)
        trigger(lettuce, "pointermove", { x: 200, y: 10, force: true })
        await nextFrame()
        await wait(100)
        trigger(lettuce, "pointerup", { force: true })
        await wait(200)
        await should(() => {
            const { left, right } = lettuce.getBoundingClientRect()
            expect(left).toBe(475)
            expect(right).toBe(685)
        })
        await should(() => {
            expect(query("nav").querySelectorAll(".tab").length).toBe(2)
        })
    })

    it("New items correctly reorderable", async () => {
        await visit(App)
        const button = query("button.add-item")
        await wait(50)
        click(button)
        await wait(150)
        const carrot = query("#Carrot-tab")
        await wait(50)
        await nextFrame()
        await nextFrame()
        trigger(carrot, "pointerdown", { x: 40, y: 10 })
        await wait(30)
        trigger(carrot, "pointermove", { x: -40, y: 10, force: true }) // Gesture will start from first move past threshold
        await nextFrame()
        await wait(100)
        trigger(carrot, "pointermove", { x: -10, y: 10, force: true })
        await nextFrame()
        await wait(100)
        trigger(carrot, "pointerup", { force: true })
        await wait(200)
        await should(() => {
            const { left } = carrot.getBoundingClientRect()
            expect(left).toBe(475)
        })
    })
})
