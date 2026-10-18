/**
 * Port of upstream's `cypress/integration/use-scroll-target-late-ref.ts` and its page,
 * `dev/react/src/tests/use-scroll-target-late-ref.tsx`.
 *
 * Reproduction for #2851: useScroll's target ref hydrated after the hook's own effects run
 * (via querySelector in an effect declared after useScroll).
 *
 * Port note: upstream renders the reproduction in a nested ReactDOM root to escape the dev
 * harness' StrictMode. Neither exists here, so `Repro` is the page. A Solid ref callback is set
 * before effects run, so the late ref is a `{ current }` object set in `onSettled`, like
 * upstream's.
 */
import type { JSX } from "@solidjs/web"
import { createSignal, onSettled } from "solid-js"
import { page } from "vitest/browser"
import { useMotionValueEvent, useScroll } from "../../src"
import { query, should, visit, wait } from "./utils"

function Repro() {
    const targetRef: { current: HTMLDivElement | null } = { current: null }

    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ["start end", "end start"],
    })

    onSettled(() => {
        targetRef.current = document.querySelector<HTMLDivElement>("#target")
    })

    const [progress, setProgress] = createSignal(0)
    useMotionValueEvent(scrollYProgress, "change", setProgress)

    return (
        <>
            <div style={topSpacer} />
            <div id="target" style={targetStyle} />
            <div style={bottomSpacer} />
            <div id="progress" style={progressStyle}>
                {progress().toFixed(4)}
            </div>
        </>
    )
}

const topSpacer: JSX.CSSProperties = { height: "200vh" }
const bottomSpacer: JSX.CSSProperties = { height: "100vh" }
const targetStyle: JSX.CSSProperties = {
    height: "100vh",
    background: "red",
}
const progressStyle: JSX.CSSProperties = {
    position: "fixed",
    top: "0px",
    left: "0px",
    background: "white",
    "z-index": 10,
}

describe("useScroll with target ref hydrated after useScroll's own effects", () => {
    it("Tracks the target element, not the whole window", async () => {
        // Target sits 1000px below the top in a 2000px-tall page (500px
        // viewport). At scrollY=400 the target is still off-screen, so
        // progress must be ~0. If useScroll falls back to whole-window
        // tracking it settles at ~0.27; if the accelerated (ViewTimeline)
        // path mistracks a late-hydrated ref it settles at ~0.36.
        await visit(Repro)
        await page.viewport(100, 500)

        await should(() => {
            expect(document.querySelectorAll("#target")).toHaveLength(1)
            expect(document.querySelectorAll("#progress")).toHaveLength(1)
        })

        window.scrollTo(0, 400)

        // Let it settle, THEN assert.
        await wait(1000)
        await should(() => {
            expect(parseFloat(query("#progress").innerText)).toBeLessThan(0.05)
        })
    })

    /**
     * Port note: not upstream. Upstream's assertion also passes if useScroll never tracks
     * anything (progress stays 0), so this checks the target is tracked once it's in view
     * (scrollY 1250 is 3/4 through "start end" → "end start", 500 → 1500).

     */
    it("Tracks the late-hydrated target once it's in view", async () => {
        await visit(Repro)
        await page.viewport(100, 500)
        window.scrollTo(0, 1250)
        await wait(1000)
        await should(() => {
            expect(parseFloat(query("#progress").innerText)).toBeCloseTo(
                0.75,
                1
            )
        })
    })
})
