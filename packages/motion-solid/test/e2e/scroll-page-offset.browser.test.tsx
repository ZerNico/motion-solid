/**
 * Port of upstream's `cypress/integration/scroll-page-offset.ts` and its page,
 * `dev/react/src/tests/scroll-page-offset.tsx`.
 *
 * scroll() and useScroll() with an offset and no target apply the offset on
 * every path. With a 1000px viewport the page scrolls 4000px, and the offset
 * ["1000px", "2000px"] maps 1000–2000px of scroll onto the animations.
 *
 * In browsers with ScrollTimeline, #box and the accelerated #use-scroll-box
 * could run natively, while #js-box always runs on the JS path.
 */
import { render } from "@solidjs/testing-library"
import type { JSX } from "@solidjs/web"
import { flush, onSettled, type Component } from "solid-js"
import { page } from "vitest/browser"
import { animate, motion, scroll, useScroll, useTransform } from "../../src"
import { nextFrame, query, should, visit, wait } from "./utils"

/**
 * `cy.viewport(width, height)` before `cy.visit()`: renders the page at that viewport size.
 */
async function visitAt(App: Component, width: number, height: number) {
    await visit(() => null)
    await page.viewport(width, height)
    await nextFrame()
    await nextFrame()
    render(() => (<App />) as JSX.Element)
    flush()
    await nextFrame()
}

const spacer: JSX.CSSProperties = { height: "100vh" }

const box = {
    position: "fixed",
    left: "0px",
    width: "100px",
    height: "100px",
    "background-color": "red",
} as const

/**
 * A page scroll() and useScroll() with an offset and no target. The offset
 * starts the animations at 1000px of scroll and ends them at 2000px.
 *
 * opacity runs on WAAPI, so where supported the #box animation and the
 * accelerated useScroll opacity can use a native ScrollTimeline. x never
 * runs on WAAPI, so #js-box always uses the JS path.
 */
function App() {
    const { scrollYProgress } = useScroll({ offset: ["1000px", "2000px"] })
    const opacity = useTransform(scrollYProgress, [0, 1], [0, 1])

    onSettled(() => {
        const transition = { ease: "linear" } as const

        const stops = [
            scroll(animate("#box", { opacity: [0, 1] }, transition), {
                offset: ["1000px", "2000px"],
            }),
            scroll(animate("#js-box", { x: [0, 100] }, transition), {
                offset: ["1000px", "2000px"],
            }),
        ]

        return () => stops.forEach((stop) => stop())
    })

    return (
        <>
            <style>{`body { margin: 0; }`}</style>
            <div style={spacer} />
            <div style={spacer} />
            <div style={spacer} />
            <div style={spacer} />
            <div style={spacer} />
            <div id="box" style={{ ...box, top: "0px" }} />
            <div id="js-box" style={{ ...box, top: "100px" }} />
            <motion.div
                id="use-scroll-box"
                style={{
                    position: "fixed",
                    left: 0,
                    width: 100,
                    height: 100,
                    backgroundColor: "red",
                    top: 200,
                    opacity,
                }}
            />
        </>
    )
}

const getX = (transform: string) =>
    transform === "none" ? 0 : parseFloat(transform.split(",")[4])

const expectProgress = (id: string, progress: number) =>
    should(() => {
        const style = getComputedStyle(query(id))
        const value =
            id === "#js-box" ? getX(style.transform) / 100 : +style.opacity
        expect(Math.abs(value - progress)).toBeLessThanOrEqual(0.05)
    })

describe("scroll() offset without a target", () => {
    it("Applies the offset to native, JS and useScroll values alike", async () => {
        await visitAt(App, 1000, 1000)
        await wait(200)

        for (const [y, progress] of [
            [500, 0],
            [1500, 0.5],
            [2500, 1],
            [1500, 0.5],
            [500, 0],
        ]) {
            window.scrollTo(0, y)
            await wait(200)
            await expectProgress("#box", progress)
            await expectProgress("#js-box", progress)
            await expectProgress("#use-scroll-box", progress)
        }
    })
})
