import { renderToString } from "../../../test/renderToString"
import { Case, type CaseName } from "./ssr.fixtures"

/**
 * Port note: upstream renders inline elements with `react-dom/server`. Here the trees are the
 * cases of `Case` in `ssr.fixtures.tsx` (server-rendered trees must come from a fixtures module),
 * rendered with Solid's server build, and `renderToStaticMarkup` is `<NoHydration>`.
 *
 * Solid's server output differs from React's in ways that don't change the markup's meaning, and
 * that are normalised before comparing with upstream's strings: hydration keys (`_hk`), empty
 * attributes rendered bare (`mask` for `mask=""`), and an empty `style=""` when there's no style.
 */
function normalize(html: string) {
    return html.replace(/<[^>]+>/g, (tag) =>
        tag
            .replace(/ _hk=[^ >]*/g, "")
            .replace(/ style=""/g, "")
            .replace(/("[^"]*")|\s([\w:-]+)(?=[\s/>])/g, (_, quoted, name) =>
                quoted !== undefined ? quoted : ` ${name}=""`
            )
    )
}

function runTests(render: (name: CaseName) => Promise<string>) {
    test("doesn't throw type or runtime errors", async () => {
        /**
         * Port note: upstream renders each component twice, from `motion` and from the
         * `motion/proxy` entry. Here `motion` is the proxy, so each is rendered once.
         */
        await render("typesAndRuntime")

        expect(true).toBe(true)
    })

    /**
     * Port note: `motion.create(Fragment)` is React-only, Solid has no `Fragment` component.
     */
    test.skip("doesn't throw when rendering Fragment", () => {})

    test("only renders independent transforms the user has given a value", async () => {
        const transformOf = async (name: CaseName) =>
            (await render(name)).match(/transform:([^;"]*)/)?.[1]

        expect(await transformOf("styleX")).toBe("translateX(100px)")
        expect(await transformOf("styleXAnimateX")).toBe("translateX(100px)")
        expect(await transformOf("styleMotionValueXAnimateX")).toBe(
            "translateX(100px)"
        )
        expect(await transformOf("initialXAnimateX")).toBe("translateX(50px)")
        expect(await transformOf("animateX")).toBe(undefined)
        expect(await transformOf("animateXKeyframes")).toBe(undefined)
        expect(await transformOf("initialFalseAnimateX")).toBe(
            "translateX(200px)"
        )
        expect(await transformOf("styleXAnimateRotate")).toBe(
            "translateX(100px)"
        )
        expect(await transformOf("styleXVariantRotate")).toBe(
            "translateX(100px)"
        )
        expect(await transformOf("initialXAnimateRotate")).toBe(
            "translateX(50px)"
        )
        expect(await transformOf("styleTransformAnimateX")).toBe(
            "translateX(10px)"
        )
    })

    test("correctly renders HTML", async () => {
        const div = await render("html")

        expect(div).toBe(
            '<div style="transform:translateX(100px) translateY(200px)"></div>'
        )
    })

    test("correctly renders custom HTML tag", async () => {
        const customElement = await render("customElement")

        expect(customElement).toBe(
            '<element-test style="transform:translateX(100px) translateY(200px)"></element-test>'
        )
    })

    test("correctly renders SVG", async () => {
        const circle = await render("svgCircle")

        expect(circle).toBe(
            '<circle cx="100" stroke-width="10" pathLength="1" stroke-dashoffset="0" stroke-dasharray="0.5 1" style="background:#fff;transform:translateX(100px);transform-origin:50% 50%;transform-box:fill-box"></circle>'
        )
        const rect = await render("svgRect")

        expect(rect).toBe(
            '<rect mask="" class="test" style="background:#fff;transform:none;transform-origin:50% 50%;transform-box:fill-box"></rect>'
        )

        const path = await render("svgPath")

        expect(path).toBe(
            '<path mask="" class="test" style="background:#fff;transform-box:view-box;transform:none;transform-origin:50% 50%"></path>'
        )
    })

    test("initial correctly overrides style", async () => {
        const div = await render("initialOverridesStyle")

        expect(div).toBe(`<div style="transform:translateX(100px)"></div>`)
    })

    test("sets tabindex='0' if onTap is set", async () => {
        const div = await render("onTap")

        expect(div).toBe(`<div tabindex="0"></div>`)
    })

    test("sets tabindex='0' if onTapStart is set", async () => {
        // Like upstream, this renders `onTap`.
        const div = await render("onTap")

        expect(div).toBe(`<div tabindex="0"></div>`)
    })

    test("sets tabindex='0' if whileTap is set", async () => {
        const div = await render("whileTap")

        expect(div).toBe(`<div tabindex="0"></div>`)
    })

    test("doesn't override tabindex", async () => {
        const div = await render("tabindex")

        expect(div).toBe(`<div tabindex="2"></div>`)
    })

    test("initial correctly overrides style with keyframes and initial={false}", async () => {
        const div = await render("initialFalseKeyframes")

        expect(div).toBe(`<div style="transform:translateX(100px)"></div>`)
    })

    test("Reorder: Renders correct element", async () => {
        const div = await render("reorderDefault")

        expect(div).toBe(
            `<ul style="overflow-anchor:none"><li draggable="false" style="z-index:unset;transform:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;touch-action:pan-x"></li></ul>`
        )
    })

    test("Reorder: Doesn't render touch-scroll disabling styles if dragListener === false", async () => {
        const div = await render("reorderNoDragListener")

        expect(div).toBe(
            `<ul style="overflow-anchor:none"><li style="z-index:unset;transform:none"></li></ul>`
        )
    })

    test("Reorder: Renders provided element", async () => {
        const div = await render("reorderAs")

        expect(div).toBe(
            `<div style="overflow-anchor:none"><div draggable="false" style="z-index:unset;transform:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;touch-action:pan-x"></div></div>`
        )
    })

    test("renders motion value child", async () => {
        const string = await render("motionValueChild")

        expect(string).toBe("<div>5</div>")
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
