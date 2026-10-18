import { renderToString } from "../../../../test/renderToString"
import { Case, type CaseName } from "./will-change.ssr.fixtures"

/**
 * Port note: upstream renders inline elements with `react-dom/server`. Here the trees are the
 * cases of `Case` in `will-change.ssr.fixtures.tsx` (server-rendered trees must come from a
 * fixtures module), rendered with Solid's server build, and `renderToStaticMarkup` is
 * `<NoHydration>`. Hydration keys (`_hk`) and an empty `style=""` (Solid renders one when there's
 * no style) are removed before comparing with upstream's strings.
 */
function normalize(html: string) {
    return html.replace(/ _hk=[^ >]*/g, "").replace(/ style=""/g, "")
}

function runTests(render: (name: CaseName) => Promise<string>) {
    test("will-change not applied", async () => {
        const div = await render("notApplied")

        expect(div).toBe(
            `<div style="--color:#000;clip-path:inset(10px);transform:translateX(100px)"></div>`
        )
    })

    test("will-change not set in static mode", async () => {
        const div = await render("staticMode")

        expect(div).toBe(
            `<div style="clip-path:inset(10px);transform:translateX(100px)"></div>`
        )
    })

    test("will-change manually set", async () => {
        const div = await render("manuallySet")

        expect(div).toBe(
            `<div style="will-change:opacity;--color:#000;transform:translateX(100px)"></div>`
        )
    })

    test("will-change manually set without animated values", async () => {
        const div = await render("manuallySetWithoutAnimatedValues")

        expect(div).toBe(`<div style="will-change:opacity"></div>`)
    })

    test("will-change not set without animated values", async () => {
        const div = await render("withoutAnimatedValues")

        expect(div).toBe(`<div></div>`)
    })

    test("Externally defined MotionValues not automatically added to will-change", async () => {
        const div = await render("externalMotionValue")

        expect(div).toBe(`<div style="opacity:0.5"></div>`)
    })

    test("will-change manually set by MotionValue", async () => {
        const div = await render("manuallySetByMotionValue")

        expect(div).toBe(
            `<div style="--color:#000;will-change:opacity;transform:translateX(100px)"></div>`
        )
    })

    test("will-change correctly not applied when isStatic", async () => {
        const div = await render("isStatic")

        expect(div).toBe(
            `<div style="--color:#000;transform:translateX(100px)"></div>`
        )
    })
}

describe("render", () => {
    runTests(async (name) =>
        normalize((await renderToString(Case, { name })).html)
    )
})

describe("renderToStaticMarkup", () => {
    runTests(async (name) =>
        normalize((await renderToString(Case, { name, static: true })).html)
    )
})
