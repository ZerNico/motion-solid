/**
 * Port of upstream's `cypress/integration/layout-shared-lightbox-crossfade.ts` and its page,
 * `dev/react/src/tests/layout-shared-lightbox-crossfade.tsx`.
 *
 * Port note: the page's `partial-ease` and `type` parameters aren't used by the spec (its
 * "switch" tests are commented out upstream), so only `instant` is ported.
 */
import { createSignal, For } from "solid-js"
import type { JSX } from "@solidjs/web"
import {
    AnimatePresence,
    motion,
    Show,
    useIsPresent,
    type Transition,
} from "../../src"
import { query, should, trigger, visit, wait, type BoundingBox } from "./utils"

/**
 * Upstream's local `expectBbox` (not rounded).
 */
function expectBbox(element: Element, expectedBbox: BoundingBox) {
    const bbox = element.getBoundingClientRect()
    expect(bbox.top).toBe(expectedBbox.top)
    expect(bbox.left).toBe(expectedBbox.left)
    expect(bbox.width).toBe(expectedBbox.width)
    expect(bbox.height).toBe(expectedBbox.height)
}

/**
 * This demonstrates children with layoutId animating
 * back to their origin components
 */

function Gallery(props: {
    items: string[]
    setOpen: (color: string) => void
    transition: Transition
}) {
    return (
        <ul style={container}>
            <For each={props.items}>
                {(color, i) => (
                    <motion.li
                        onClick={() => props.setOpen(color)}
                        style={{
                            ...item,
                            backgroundColor: color,
                            borderRadius: 0,
                        }}
                        layoutId={color}
                        transition={props.transition}
                        id={i() === 0 ? `item-parent` : undefined}
                    >
                        <motion.div
                            style={child}
                            id={i() === 0 ? `item-child` : undefined}
                            layoutId={`child-${color}`}
                            transition={props.transition}
                        />
                    </motion.li>
                )}
            </For>
        </ul>
    )
}

function SingleImage(props: {
    color: string
    setOpen: (open: false) => void
    transition: Transition
}) {
    const isPresent = useIsPresent()

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    ...overlay,
                    pointerEvents: isPresent() ? "auto" : "none",
                }}
                id="overlay"
                transition={props.transition}
                onClick={() => props.setOpen(false)}
            />
            <div style={singleImageContainer}>
                <motion.div
                    id="parent"
                    layoutId={props.color}
                    style={{
                        ...singleImage,
                        backgroundColor: "#fff",
                        borderRadius: 50,
                    }}
                    transition={props.transition}
                >
                    <motion.div
                        style={{ ...child, backgroundColor: "black" }}
                        id="child"
                        layoutId={`child-${props.color}`}
                        transition={props.transition}
                    />
                </motion.div>
            </div>
        </>
    )
}

function App(props: { instant?: string }) {
    const [openColor, setOpen] = createSignal<false | string>(false)
    const transition: Transition = props.instant
        ? { type: false }
        : { duration: 0.01 }

    // Port note: React's `key={openColor}` → a keyed `Show`.
    return (
        <div style={background}>
            <Gallery items={colors} setOpen={setOpen} transition={transition} />
            <AnimatePresence>
                <Show when={openColor()} keyed>
                    {(color) => (
                        <SingleImage
                            color={color}
                            setOpen={setOpen}
                            transition={transition}
                        />
                    )}
                </Show>
            </AnimatePresence>
        </div>
    )
}

const numColors = 3 // 4 * 4
const makeColor = (hue: number) => `hsl(${hue}, 100%, 50%)`
const colors = Array.from(Array(numColors)).map((_, i) =>
    makeColor(Math.round((360 / numColors) * i))
)

const background: JSX.CSSProperties = {
    position: "fixed",
    top: "0",
    left: "0",
    bottom: "0",
    right: "0",
    display: "flex",
    "justify-content": "center",
    "align-items": "center",
    background: "#ccc",
}

const container: JSX.CSSProperties = {
    "background-color": "#eeeeee",
    "border-radius": "25px",
    width: "600px",
    height: "600px",
    margin: "0",
    padding: "0 20px 20px 0",
    display: "flex",
    "flex-wrap": "wrap",
    "justify-content": "space-between",
    "align-items": "space-between",
    "list-style": "none",
}

const item = {
    padding: "20px",
    cursor: "pointer",
    margin: "20px 0 0 20px",
    flex: "1 1 90px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
}

const overlay = {
    background: "rgba(0,0,0,0.6)",
    position: "fixed",
    top: "0",
    left: "0",
    bottom: "0",
    right: "0",
} as const

const singleImageContainer: JSX.CSSProperties = {
    position: "absolute",
    top: "0",
    left: "0",
    bottom: "0",
    right: "0",
    display: "flex",
    "justify-content": "center",
    "align-items": "center",
    "pointer-events": "none",
}

const singleImage = {
    width: "500px",
    height: "300px",
    padding: 50,
}

const child = {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "white",
    opacity: 0.5,
}

async function runScriptCrossfade(props: { instant?: string }) {
    await visit(App, props)
    await wait(50)
    await should(() =>
        expectBbox(query("#item-parent"), {
            top: 40,
            left: 210,
            width: 180,
            height: 580,
        })
    )
    await should(() =>
        expectBbox(query("#item-child"), {
            top: 305,
            left: 275,
            width: 50,
            height: 50,
        })
    )
    // Open lightbox
    trigger(query("#item-child"), "click")
    await wait(50)
    await should(() => {
        const $box = query("#item-parent")
        // Port note: WebKit serializes one more decimal ("8.333333%").
        expect(
            window
                .getComputedStyle($box)
                .borderRadius.replace(/\d+\.\d+/g, (v) =>
                    String(Number(Number(v).toFixed(5)))
                )
        ).toBe("8.33333% / 12.5%")
        expect(window.getComputedStyle($box).opacity).toBe("0")
        expectBbox($box, {
            top: 130,
            left: 200,
            width: 600,
            height: 400,
        })
    })
    await should(() => {
        const $box = query("#item-child")
        expect(window.getComputedStyle($box).borderRadius).toBe("50%")
        expect(window.getComputedStyle($box).opacity).toBe("0")
        expectBbox($box, {
            top: 180,
            left: 250,
            width: 50,
            height: 50,
        })
    })
    await should(() => {
        const $box = query("#parent")
        expect(window.getComputedStyle($box).borderRadius).toBe("50px")
        expect(window.getComputedStyle($box).opacity).toBe("1")
        expectBbox($box, {
            top: 130,
            left: 200,
            width: 600,
            height: 400,
        })
    })
    await should(() => {
        const $box = query("#child")
        expect(window.getComputedStyle($box).borderRadius).toBe("25px")
        expect(window.getComputedStyle($box).opacity).toBe("0.5")
        expectBbox($box, {
            top: 180,
            left: 250,
            width: 50,
            height: 50,
        })
    })
    // Close lightbox
    trigger(query("#overlay"), "click")
    await wait(50)
    await should(() => {
        const $box = query("#item-parent")
        expect(window.getComputedStyle($box).borderRadius).toBe("0px")
        expect(window.getComputedStyle($box).opacity).toBe("1")
        expectBbox($box, {
            top: 40,
            left: 210,
            width: 180,
            height: 580,
        })
    })
    await should(() => {
        const $box = query("#item-child")
        expect(window.getComputedStyle($box).borderRadius).toBe("25px")
        expect(window.getComputedStyle($box).opacity).toBe("0.5")
        expectBbox($box, {
            top: 305,
            left: 275,
            width: 50,
            height: 50,
        })
    })
}

describe("Shared layout lightbox example, crossfade", () => {
    it("Correctly animates between items and lightbox with instant transition", async () => {
        await runScriptCrossfade({ instant: "true" })
    })
    it("Correctly animates between items and lightbox with very fast transition", async () => {
        await runScriptCrossfade({})
    })
})
