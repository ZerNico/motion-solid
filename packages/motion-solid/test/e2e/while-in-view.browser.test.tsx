/**
 * Port of upstream's `cypress/integration/while-in-view.ts` and its pages,
 * `dev/react/src/tests/while-in-view.tsx` and `dev/react/src/tests/while-in-view-custom-root.tsx`.
 */
import { createSignal } from "solid-js"
import { motion } from "../../src"
import { query, should, visit, wait } from "./utils"

/**
 * Port note: upstream's page also reads a `delete` parameter (replaces `window.IntersectionObserver`
 * with `undefined`) and a `disableFallback` one (`viewport.fallback`, not in motion-dom's
 * `ViewportOptions` type), which none of the specs use, so they aren't ported.
 */
function App(props: {
    amount?: "some" | "all"
    once?: string
    margin?: string
}) {
    const amount = props.amount || undefined
    const once = props.once ? true : undefined
    const margin = props.margin || undefined
    const [inViewport, setInViewport] = createSignal(false)

    return (
        <div style={{ "padding-top": "700px" }}>
            <motion.div
                id="box"
                initial={false}
                transition={{ duration: 0.01 }}
                animate={{ background: "rgba(255,0,0,1)" }}
                whileInView={{ background: "rgba(0,255,0,1)" }}
                viewport={{ amount, once, margin }}
                style={{ width: 100, height: 100 }}
                onViewportEnter={() => setInViewport(true)}
                onViewportLeave={() => setInViewport(false)}
            >
                {inViewport() ? "In" : "Out"}
            </motion.div>
        </div>
    )
}

function CustomRootApp() {
    const containerRef: { current: HTMLDivElement | null } = { current: null }

    return (
        <div
            id="container"
            style={{ width: "300px", overflow: "scroll", display: "flex" }}
            ref={(element) => (containerRef.current = element)}
        >
            <div style={{ flex: "0 0 400px" }} />
            <motion.div
                id="box"
                initial={false}
                transition={{ duration: 0.01 }}
                animate={{ background: "rgba(255,0,0,1)" }}
                whileInView={{ background: "rgba(0,255,0,1)" }}
                viewport={{ root: containerRef }}
                style={{ width: 100, height: 100, flexShrink: 0 }}
            />
        </div>
    )
}

describe("whileInView", () => {
    it("Animates when an element enters the viewport", async () => {
        await visit(App)
        await wait(50)
        await should(() => {
            const element = query("#box")
            expect(element.style.backgroundColor).toBe("rgb(255, 0, 0)")
            expect(element.innerHTML).toBe("Out")
        })

        window.scrollTo(0, 50)
        await wait(50)
        await should(() => {
            const element = query("#box")
            expect(element.style.backgroundColor).toBe("rgb(0, 255, 0)")
            expect(element.innerHTML).toBe("In")
        })
    })

    it("Animates when an element leaves the viewport", async () => {
        await visit(App)
        await wait(50)
        window.scrollTo(0, 0)
        await wait(50)
        await should(() => {
            const element = query("#box")
            expect(element.style.backgroundColor).toBe("rgb(255, 0, 0)")
            expect(element.innerHTML).toBe("Out")
        })
    })

    it("Animates only when all an element enters the viewport and amount='all'", async () => {
        await visit(App, { amount: "all" })
        await wait(50)
        await should(() => {
            expect(query("#box").style.backgroundColor).toBe("rgb(255, 0, 0)")
        })

        window.scrollTo(0, 50)
        await wait(50)
        await should(() => {
            expect(query("#box").style.backgroundColor).toBe("rgb(255, 0, 0)")
        })

        window.scrollTo(0, 150)
        await wait(50)
        await should(() => {
            expect(query("#box").style.backgroundColor).toBe("rgb(0, 255, 0)")
        })
    })

    it("Animates when an element enters the viewport once", async () => {
        await visit(App, { once: "true" })
        await wait(50)
        await should(() => {
            const element = query("#box")
            expect(element.style.backgroundColor).toBe("rgb(255, 0, 0)")
            expect(element.innerHTML).toBe("Out")
        })

        window.scrollTo(0, 50)
        await wait(50)
        await should(() => {
            const element = query("#box")
            expect(element.style.backgroundColor).toBe("rgb(0, 255, 0)")
            expect(element.innerHTML).toBe("In")
        })

        window.scrollTo(0, 0)
        await wait(50)
        await should(() => {
            const element = query("#box")
            expect(element.style.backgroundColor).toBe("rgb(0, 255, 0)")
            expect(element.innerHTML).toBe("In")
        })
    })

    it("Animates when entering a custom root", async () => {
        await visit(CustomRootApp)
        await wait(50)
        await should(() => {
            expect(query("#box").style.backgroundColor).toBe("rgb(255, 0, 0)")
        })

        query("#container").scrollTo(500, 0)
        await wait(50)
        await should(() => {
            expect(query("#box").style.backgroundColor).toBe("rgb(0, 255, 0)")
        })

        query("#container").scrollTo(0, 0)
        await wait(50)
        await should(() => {
            expect(query("#box").style.backgroundColor).toBe("rgb(255, 0, 0)")
        })
    })

    /**
     * Manually verified this does work but headless browser not respecting margin
     */
    it.skip("Respects margin", async () => {
        await visit(App, { margin: "100px" })
        await wait(100)
        await should(() => {
            const element = query("#box")
            expect(element.style.backgroundColor).toBe("rgb(0, 255, 0)")
            expect(element.innerHTML).toBe("In")
        })
    })
})
