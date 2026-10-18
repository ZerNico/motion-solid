/**
 * Port of upstream's `cypress/integration/reorder-release-before-frame.ts` and the page it
 * visits, `dev/react/src/tests/drag-to-reorder.tsx`.
 */
import { createSignal, For, onSettled } from "solid-js"
import { animate, Reorder, useMotionValue } from "../../src"
import { nextFrame, query, should, visit } from "./utils"

const inactiveShadow = "0px 0px 0px rgba(0,0,0,0.8)"

const initialItems = ["Tomato", "Cucumber", "Mustard", "Chicken"]

function Item(props: { item: string; axis: string }) {
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const axisValue = props.axis === "y" ? y : x
    const boxShadow = useMotionValue(inactiveShadow)

    onSettled(() => {
        let isActive = false
        return axisValue.on("change", (latestY) => {
            const wasActive = isActive
            if (latestY !== 0) {
                isActive = true
                if (isActive !== wasActive) {
                    animate(boxShadow, "5px 5px 10px rgba(0,0,0,0.3)")
                }
            } else {
                isActive = false
                if (isActive !== wasActive) {
                    animate(boxShadow, inactiveShadow)
                }
            }
        })
    })

    return (
        <Reorder.Item
            value={props.item}
            id={props.item}
            style={{ boxShadow, y }}
            dragTransition={{ bounceStiffness: 2000, bounceDamping: 10000 }}
            transition={{ duration: 0.1 }}
        >
            <span>{props.item}</span>
            <ReorderIcon />
        </Reorder.Item>
    )
}

function App(props: { axis?: "x" | "y" }) {
    const [items, setItems] = createSignal(initialItems)
    const axis = props.axis || "y"

    return (
        <Reorder.Group
            axis={axis}
            onReorder={setItems}
            style={axis === "y" ? verticalList : horizontalList}
            values={items()}
        >
            <For each={items()}>
                {(item) => <Item axis={axis} item={item} />}
            </For>
            <style>{styles}</style>
        </Reorder.Group>
    )
}

function ReorderIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 39 39"
            width="39"
            height="39"
        >
            <path
                d="M 5 0 C 7.761 0 10 2.239 10 5 C 10 7.761 7.761 10 5 10 C 2.239 10 0 7.761 0 5 C 0 2.239 2.239 0 5 0 Z"
                fill="#CCC"
            ></path>
            <path
                d="M 19 0 C 21.761 0 24 2.239 24 5 C 24 7.761 21.761 10 19 10 C 16.239 10 14 7.761 14 5 C 14 2.239 16.239 0 19 0 Z"
                fill="#CCC"
            ></path>
            <path
                d="M 33 0 C 35.761 0 38 2.239 38 5 C 38 7.761 35.761 10 33 10 C 30.239 10 28 7.761 28 5 C 28 2.239 30.239 0 33 0 Z"
                fill="#CCC"
            ></path>
            <path
                d="M 33 14 C 35.761 14 38 16.239 38 19 C 38 21.761 35.761 24 33 24 C 30.239 24 28 21.761 28 19 C 28 16.239 30.239 14 33 14 Z"
                fill="#CCC"
            ></path>
            <path
                d="M 19 14 C 21.761 14 24 16.239 24 19 C 24 21.761 21.761 24 19 24 C 16.239 24 14 21.761 14 19 C 14 16.239 16.239 14 19 14 Z"
                fill="#CCC"
            ></path>
            <path
                d="M 5 14 C 7.761 14 10 16.239 10 19 C 10 21.761 7.761 24 5 24 C 2.239 24 0 21.761 0 19 C 0 16.239 2.239 14 5 14 Z"
                fill="#CCC"
            ></path>
            <path
                d="M 5 28 C 7.761 28 10 30.239 10 33 C 10 35.761 7.761 38 5 38 C 2.239 38 0 35.761 0 33 C 0 30.239 2.239 28 5 28 Z"
                fill="#CCC"
            ></path>
            <path
                d="M 19 28 C 21.761 28 24 30.239 24 33 C 24 35.761 21.761 38 19 38 C 16.239 38 14 35.761 14 33 C 14 30.239 16.239 28 19 28 Z"
                fill="#CCC"
            ></path>
            <path
                d="M 33 28 C 35.761 28 38 30.239 38 33 C 38 35.761 35.761 38 33 38 C 30.239 38 28 35.761 28 33 C 28 30.239 30.239 28 33 28 Z"
                fill="#CCC"
            ></path>
        </svg>
    )
}

const verticalList = {}

const horizontalList = {
    display: "flex",
}

const styles = `body {
  width: 100vw;
  height: 100vh;
  background: #ffaa00;
  overflow: hidden;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

nav {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 300px;
}

ul,
li {
  list-style: none;
  padding: 0;
  margin: 0;
    font-family: GT Walsheim, sans serif;
    font-weight: 700;
    font-size: 24px;
}

ul {
  position: relative;
  width: 300px;
}

li {
  border-radius: 10px;
  margin-bottom: 10px;
  width: 100%;
  padding: 20px;
  position: relative;
  background: white;
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

li svg {
    width: 18px;
    height: 18px;
    cursor: grab;
}
`

function pointer(el: Element, type: string, x: number, y: number) {
    const win = el.ownerDocument.defaultView as any
    el.dispatchEvent(
        new win.PointerEvent(type, {
            clientX: x,
            clientY: y,
            isPrimary: true,
            bubbles: true,
            pointerId: 1,
            button: 0,
            pointerType: "mouse",
        })
    )
}

const closeTo = (actual: number, expected: number, delta: number) =>
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(delta)

describe("Reorder release before the next frame", () => {
    it("Reorders when the final move arrives in the same frame as pointerup", async () => {
        await visit(App)
        const cucumber = query("#Cucumber").getBoundingClientRect()
        const el = query("#Tomato")
        await nextFrame()
        await nextFrame()

        const tomato = el.getBoundingClientRect()
        const x = tomato.left + 10
        pointer(el, "pointerdown", x, tomato.top + 10)
        pointer(el, "pointermove", x, tomato.top + 15)
        await nextFrame()

        pointer(el, "pointermove", tomato.left + 10, tomato.top + 35)
        await nextFrame()

        // 55px down: past Cucumber's centre, released within the frame
        const y = tomato.top + 65
        pointer(el, "pointermove", tomato.left + 10, y)
        pointer(el, "pointerup", tomato.left + 10, y)

        await should(() => {
            const element = query("#Tomato")
            const ids = [...element.parentElement!.children]
                .map((child) => child.id)
                .filter(Boolean)
            expect(ids.slice(0, 2)).toEqual(["Cucumber", "Tomato"])
            closeTo(element.getBoundingClientRect().top, cucumber.top, 2)
        })
        await should(() =>
            closeTo(
                query("#Cucumber").getBoundingClientRect().top,
                tomato.top,
                2
            )
        )
    })
})
