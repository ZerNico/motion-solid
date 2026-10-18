/**
 * Port of upstream's `cypress/integration/drag-input-propagation.ts` and its page,
 * `dev/react/src/tests/drag-input-propagation.tsx`.
 */
import { motion } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * Test page for issue #1674: Interactive elements inside draggable elements
 * should not trigger drag when clicked/interacted with.
 */
function App() {
    return (
        <div style={{ padding: "100px" }}>
            <motion.div
                id="draggable"
                data-testid="draggable"
                drag
                dragElastic={0}
                dragMomentum={false}
                style={{
                    width: 400,
                    height: 200,
                    background: "red",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: 10,
                }}
            >
                <input
                    type="text"
                    data-testid="input"
                    value="Select me"
                    style={{
                        width: "80px",
                        height: "30px",
                        padding: "5px",
                    }}
                />
                <textarea
                    data-testid="textarea"
                    value="Text"
                    style={{
                        width: "60px",
                        height: "30px",
                        padding: "5px",
                    }}
                />
                <button
                    data-testid="button"
                    style={{
                        width: "60px",
                        height: "30px",
                        padding: "5px",
                    }}
                >
                    Click
                </button>
                <a
                    href="#test"
                    data-testid="link"
                    style={{
                        display: "inline-block",
                        width: "60px",
                        height: "30px",
                        padding: "5px",
                        background: "white",
                    }}
                >
                    Link
                </a>
                <select
                    data-testid="select"
                    style={{
                        width: "80px",
                        height: "30px",
                    }}
                >
                    <option value="1">Option 1</option>
                    <option value="2">Option 2</option>
                    <option value="3">Option 3</option>
                </select>
                <label
                    data-testid="label"
                    style={{
                        display: "flex",
                        "align-items": "center",
                        gap: "5px",
                        background: "white",
                        padding: "5px",
                    }}
                >
                    <input type="checkbox" data-testid="checkbox" />
                    Check
                </label>
                <div
                    contenteditable
                    data-testid="contenteditable"
                    style={{
                        width: "80px",
                        height: "30px",
                        padding: "5px",
                        background: "white",
                    }}
                >
                    Edit me
                </div>
            </motion.div>
        </div>
    )
}

const draggable = () => query("[data-testid='draggable']")

async function visitAndCheckInitialPosition() {
    await visit(App)
    await wait(200)
    await should(() => {
        const { left, top } = draggable().getBoundingClientRect()
        // Initial position is at padding: 100
        expect(left).toBe(100)
        expect(top).toBe(100)
    })
}

/**
 * The gesture every test performs on `element`.
 */
async function dragFrom(
    element: Element,
    down: [number, number] = [5, 5],
    start: [number, number] = [10, 10]
) {
    await nextFrame()
    await nextFrame()
    trigger(element, "pointerdown", { x: down[0], y: down[1] })
    trigger(element, "pointermove", { x: start[0], y: start[1] })
    await nextFrame()
    await wait(50)
    trigger(element, "pointermove", { x: 200, y: 200, force: true })
    await nextFrame()
    await wait(50)
    trigger(element, "pointerup", { force: true })
}

async function expectNotMoved() {
    await should(() => {
        const { left, top } = draggable().getBoundingClientRect()
        // Element should still be at its initial position
        expect(left).toBe(100)
        expect(top).toBe(100)
    })
}

async function expectMoved() {
    await should(() => {
        const { left, top } = draggable().getBoundingClientRect()
        // Element should have moved
        expect(left).toBeGreaterThan(200)
        expect(top).toBeGreaterThan(200)
    })
}

/**
 * Tests for drag behavior with interactive elements inside draggable elements.
 *
 * Form controls where text selection or direct interaction is expected
 * (input, textarea, select, contenteditable) should NOT trigger drag.
 *
 * Buttons and links SHOULD allow drag since they don't have click-and-move
 * actions of their own.
 */
describe("Drag Input Propagation", () => {
    it("Should not drag when clicking and dragging on an input inside draggable", async () => {
        await visitAndCheckInitialPosition()

        // Attempt to drag by clicking on the input
        await dragFrom(query("[data-testid='input']"))

        // Verify the draggable element did NOT move
        await expectNotMoved()
    })

    it("Should not drag when clicking and dragging on a textarea inside draggable", async () => {
        await visitAndCheckInitialPosition()

        // Attempt to drag by clicking on the textarea
        await dragFrom(query("[data-testid='textarea']"))

        // Verify the draggable element did NOT move
        await expectNotMoved()
    })

    it("Should drag when clicking and dragging on a button inside draggable", async () => {
        await visitAndCheckInitialPosition()

        // Drag by clicking on the button - buttons don't have click-and-move actions
        await dragFrom(query("[data-testid='button']"))

        // Verify the draggable element DID move
        await expectMoved()
    })

    it("Should drag when clicking and dragging on a link inside draggable", async () => {
        await visitAndCheckInitialPosition()

        // Drag by clicking on the link - links don't have click-and-move actions
        await dragFrom(query("[data-testid='link']"))

        // Verify the draggable element DID move
        await expectMoved()
    })

    it("Should not drag when clicking and dragging on a select inside draggable", async () => {
        await visitAndCheckInitialPosition()

        // Attempt to drag by clicking on the select
        await dragFrom(query("[data-testid='select']"))

        // Verify the draggable element did NOT move
        await expectNotMoved()
    })

    it("Should not drag when clicking and dragging on a checkbox inside a label inside draggable", async () => {
        await visitAndCheckInitialPosition()

        // Attempt to drag by clicking on the checkbox (nested inside label)
        await dragFrom(query("[data-testid='checkbox']"), [2, 2], [5, 5])

        // Verify the draggable element did NOT move
        await expectNotMoved()
    })

    it("Should not drag when clicking and dragging on a contenteditable element inside draggable", async () => {
        await visitAndCheckInitialPosition()

        // Attempt to drag by clicking on the contenteditable element
        await dragFrom(query("[data-testid='contenteditable']"))

        // Verify the draggable element did NOT move
        await expectNotMoved()
    })

    it("Should still drag when clicking on the draggable area outside interactive elements", async () => {
        await visitAndCheckInitialPosition()

        // Click on edge of draggable, not on interactive elements (at coordinates 5,5 which is top-left corner)
        await dragFrom(draggable())

        // Element should have moved - the exact position depends on gesture calculation
        // but should NOT be at original position of 100,100
        await expectMoved()
    })
})
