/**
 * Port of upstream's `cypress/integration/drag-to-reorder.ts` and its page,
 * `dev/react/src/tests/drag-to-reorder.tsx`.
 */
import { createSignal, For, onSettled } from "solid-js"
import { animate, Reorder, useMotionValue } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

const inactiveShadow = "0px 0px 0px rgba(0,0,0,0.8)"

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

const initialItems = ["Tomato", "Cucumber", "Mustard", "Chicken"]

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
    /* Port note: Cypress' Chrome line height, so every browser lays out 68px items. */
    line-height: 28px;
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

.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 300px;
  background: #fff;
}

.refresh {
  padding: 10px;
  position: absolute;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  width: 20px;
  height: 20px;
  top: 10px;
  right: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
`

interface BoundingBox {
    top: number
    left: number
    width: number
    height: number
}

function expectBbox(element: HTMLElement, expectedBbox: BoundingBox) {
    const bbox = element.getBoundingClientRect()
    /**
     * Using within as this test is measuring differently on different Mac screens
     */
    const within = (actual: number, expected: number) => {
        expect(actual).toBeGreaterThanOrEqual(expected - 2)
        expect(actual).toBeLessThanOrEqual(expected + 2)
    }
    within(bbox.left, expectedBbox.left)
    within(bbox.top, expectedBbox.top)
    within(bbox.width, expectedBbox.width)
    within(bbox.height, expectedBbox.height)
}

const shouldBbox = (selector: string, expected: BoundingBox) =>
    should(() => expectBbox(query(selector), expected))

describe("Drag to reorder", () => {
    it("Y axis", async () => {
        await visit(App)
        await wait(50)
        await shouldBbox("#Tomato", {
            height: 68,
            left: 350,
            top: 174,
            width: 340,
        })
        await shouldBbox("#Cucumber", {
            height: 68,
            left: 350,
            top: 253,
            width: 340,
        })
        let el = query("#Tomato")
        await nextFrame()
        await nextFrame()
        trigger(el, "pointerdown", { x: 360, y: 175, force: true })
        await wait(50)
        trigger(el, "pointermove", { x: 360, y: 180, force: true })
        await nextFrame()
        await wait(50)
        trigger(el, "pointermove", { x: 360, y: 200, force: true })
        await nextFrame()
        await wait(50)
        trigger(el, "pointermove", { x: 360, y: 220, force: true })
        await nextFrame()
        await wait(100)
        await shouldBbox("#Tomato", {
            height: 68,
            left: 350,
            top: 249,
            width: 340,
        })
        await shouldBbox("#Cucumber", {
            height: 68,
            left: 350,
            top: 174,
            width: 340,
        })
        el = query("#Tomato")
        trigger(el, "pointerup", { x: 360, y: 220, force: true })
        await wait(100)
        await shouldBbox("#Tomato", {
            height: 68,
            left: 350,
            top: 252,
            width: 340,
        })
        el = query("#Cucumber")
        trigger(el, "pointerdown", { x: 360, y: 175, force: true })
        await wait(50)
        trigger(el, "pointermove", { x: 360, y: 180, force: true })
        await nextFrame()
        await wait(50)
        trigger(el, "pointermove", { x: 360, y: 200, force: true })
        await nextFrame()
        await wait(50)
        trigger(el, "pointermove", { x: 360, y: 220, force: true })
        await nextFrame()
        await wait(100)
        el = query("#Cucumber")
        await shouldBbox("#Cucumber", {
            height: 68,
            left: 350,
            top: 249,
            width: 340,
        })
        trigger(el, "pointerup", { x: 360, y: 220, force: true })
        el = query("#Tomato")
        await shouldBbox("#Tomato", {
            height: 68,
            left: 350,
            top: 175,
            width: 340,
        })
        trigger(el, "pointerdown", { x: 360, y: 0, force: true })
        await wait(100)
        trigger(el, "pointermove", { x: 360, y: -100, force: true })
        await nextFrame()
        await wait(100)
        trigger(el, "pointerup", { x: 360, y: -100, force: true })
        await wait(20)
        trigger(el, "pointerdown", { x: 360, y: -100, force: true })
        await wait(50)
        trigger(el, "pointerup", { x: 360, y: -100, force: true })
        await wait(100)
        await shouldBbox("#Tomato", {
            height: 68,
            left: 350,
            top: 176,
            width: 340,
        })
    })

    it("X axis", async () => {
        await visit(App, { axis: "x" })
        await wait(50)
        await shouldBbox("#Tomato", {
            height: 68,
            left: 350,
            top: 291,
            width: 340,
        })
        await shouldBbox("#Cucumber", {
            height: 68,
            left: 690,
            top: 291,
            width: 340,
        })
        const el = query("#Tomato")
        await nextFrame()
        await nextFrame()
        trigger(el, "pointerdown", { x: 360, y: 175, force: true })
        await wait(50)
        trigger(el, "pointermove", { x: 365, y: 175, force: true })
        await nextFrame()
        await wait(50)
        trigger(el, "pointermove", { x: 425, y: 175, force: true })
        await nextFrame()
        await wait(50)
        trigger(el, "pointermove", { x: 475, y: 175, force: true })
        await nextFrame()
        await wait(100)
        await shouldBbox("#Tomato", {
            height: 68,
            left: 535,
            top: 291,
            width: 340,
        })
        await shouldBbox("#Cucumber", {
            height: 68,
            left: 350,
            top: 291,
            width: 340,
        })
    })

    it("Move around", async () => {
        const checkBox = () =>
            shouldBbox("#Tomato", {
                height: 68,
                left: 350,
                top: 174,
                width: 340,
            })

        const moveAround = async (steps: number[]) => {
            const baseY = 175
            const delta = 20
            const el = query("#Tomato")
            await nextFrame()
            await nextFrame()
            trigger(el, "pointerdown", { x: 360, y: baseY, force: true })
            await wait(150)

            for (const step of steps) {
                for (let i = 0; i < Math.abs(step); i++) {
                    const y = step > 0 ? delta : -delta
                    trigger(el, "pointermove", {
                        x: 360,
                        y: baseY + y,
                        force: true,
                    })
                    await nextFrame()
                    await wait(150)
                }
            }
            trigger(el, "pointerup", { x: 360, y: baseY, force: true })
            await wait(150)
        }

        await visit(App)
        await wait(50)
        await checkBox()

        /**
         * Re-query so the check retries: the snap back to origin needs two
         * frames after release, which slow CI can take longer than
         * moveAround's 150ms wait to produce.
         */
        await moveAround([-4, 14, -8, 4, -5, 2, -6])
        await checkBox()
    })
})
