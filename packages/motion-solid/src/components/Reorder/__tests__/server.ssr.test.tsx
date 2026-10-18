import { renderToString } from "../../../../test/renderToString"
import {
    BadGroupComponent1,
    BadGroupComponent2,
    BadGroupComponent3,
    BadItemComponent1,
    BadItemComponent2,
    BadItemComponent3,
    Component,
    CorrectComponent,
    TypedComponent,
} from "./server.ssr.fixtures"

/**
 * Port note: upstream renders with `react-dom/server`. Here the components are in
 * `server.ssr.fixtures.tsx` (server-rendered trees must come from a fixtures module), rendered with
 * Solid's server build, and `renderToStaticMarkup` is `<NoHydration>`. Hydration keys (`_hk`) are
 * removed before comparing with upstream's markup.
 */
const normalize = (html: string) => html.replace(/ _hk=[^ >]*/g, "")

const renderToStaticMarkup = async (component: typeof Component) =>
    normalize((await renderToString(component, { static: true })).html)

describe("Reorder", () => {
    it("Correctly renders HTML", async () => {
        const staticMarkup = await renderToStaticMarkup(Component)
        const string = normalize((await renderToString(Component)).html)

        const expectedMarkup = `<article style="overflow-anchor:none"><main draggable="false" style="z-index:unset;transform:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;touch-action:pan-x"></main></article>`

        expect(staticMarkup).toBe(expectedMarkup)
        expect(string).toBe(expectedMarkup)
    })

    it("onReorder is typed correctly", async () => {
        const staticMarkup = await renderToStaticMarkup(TypedComponent)
        const string = normalize((await renderToString(TypedComponent)).html)

        const expectedMarkup = `<article style="overflow-anchor:none"><main draggable="false" style="z-index:unset;transform:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;touch-action:pan-x"></main></article>`

        expect(staticMarkup).toBe(expectedMarkup)
        expect(string).toBe(expectedMarkup)
    })

    it("HTML props have incorrect types - these should fail TypeScript checking", async () => {
        // Port note: the components (and their @ts-expect-error comments) are in the fixtures.
        await expect(renderToString(CorrectComponent)).resolves.toBeDefined()

        // These components demonstrate that the type system isn't catching HTML prop type errors
        // In a properly typed system, the above components would fail to compile
        await expect(renderToString(BadGroupComponent1)).resolves.toBeDefined()
        await expect(renderToString(BadGroupComponent2)).resolves.toBeDefined()
        await expect(renderToString(BadGroupComponent3)).resolves.toBeDefined()
        await expect(renderToString(BadItemComponent1)).resolves.toBeDefined()
        await expect(renderToString(BadItemComponent2)).resolves.toBeDefined()
        await expect(renderToString(BadItemComponent3)).resolves.toBeDefined()
    })
})
