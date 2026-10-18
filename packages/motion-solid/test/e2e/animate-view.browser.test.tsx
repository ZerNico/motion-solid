/**
 * Port of upstream's `cypress/integration/animate-view.ts` and its page,
 * `dev/react/src/tests/animate-view.tsx`.
 *
 * Port note: `AnimateView` (`motion/react-animate-view`) isn't ported. It's built on React
 * 19.3's `<ViewTransition>` and `startTransition`, which have no Solid equivalent, and the
 * spec's other half checks the error thrown on unsupported React versions. Only the part that
 * applies to motion-solid is ported: importing alongside ordinary Motion keeps it working, and
 * the page reports `AnimateView` as unsupported.
 */
import { motion } from "../../src"
import { query, should, visit } from "./utils"

function App() {
    const supported = false

    return (
        <>
            <div id="supported">{String(supported)}</div>
            <motion.div id="ordinary" animate={{ opacity: 0.5 }}>
                Solid
            </motion.div>
        </>
    )
}

describe("AnimateView entry point", () => {
    it("keeps ordinary Motion working and reports unsupported React versions", async () => {
        await visit(App)
        await should(() =>
            expect(getComputedStyle(query("#ordinary")).opacity).toBe("0.5")
        )
        expect(query("#supported").textContent).toBe("false")
        // Port note: upstream then clicks `#toggle` and expects the error boundary to show
        // "AnimateView requires React 19.3". React-specific, not ported (see above).
    })

    /**
     * These cases need a browser with startViewTransition, and upstream's `AnimateView`.
     */
    for (const mode of ["default", "custom", "share", "update"]) {
        // Port note: `AnimateView` isn't ported (React `<ViewTransition>`-specific, see above).
        it.skip(`animates ${mode} views with Motion timing`, () => {})
    }
})
