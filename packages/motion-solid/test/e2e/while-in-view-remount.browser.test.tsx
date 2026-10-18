/**
 * Port of upstream's `cypress/integration/while-in-view-remount.ts` and its page,
 * `dev/react/src/tests/while-in-view-remount.tsx`.
 */
import { createSignal, Show } from "solid-js"
import { motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

/**
 * Reproduces #3079: whileInView not triggering after soft navigation.
 * Tests several scenarios:
 * - Element already in viewport on mount
 * - Element remounting after unmount (soft navigation)
 * - Element with custom root ref
 */
function App() {
    const [page, setPage] = createSignal<"home" | "projects">("home")

    return (
        <div>
            <nav>
                <button id="go-home" onClick={() => setPage("home")}>
                    Home
                </button>
                <button id="go-projects" onClick={() => setPage("projects")}>
                    Projects
                </button>
            </nav>
            <Show when={page() === "home"}>
                <HomePage />
            </Show>
            <Show when={page() === "projects"}>
                <ProjectsPage />
            </Show>
        </div>
    )
}

function HomePage() {
    return <div id="home-page">Home</div>
}

function ProjectsPage() {
    return (
        <div id="projects-page">
            <Card id="card1" />
            <Card id="card2" />
        </div>
    )
}

function Card(props: { id: string }) {
    const scrollRef: { current: HTMLElement | null } = { current: null }

    return (
        <article ref={(element) => (scrollRef.current = element)}>
            <motion.div
                id={props.id}
                data-in-view="false"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ root: scrollRef, once: true }}
                transition={{ duration: 0.01 }}
                onViewportEnter={() => {
                    const el = document.getElementById(props.id)
                    if (el) el.dataset.inView = "true"
                }}
                style={{ width: 100, height: 100, background: "red" }}
            />
        </article>
    )
}

const opacityOf = (selector: string) =>
    parseFloat(getComputedStyle(query(selector)).opacity)

describe("whileInView remount (#3079)", () => {
    it("Triggers whileInView on initial mount", async () => {
        await visit(App)
        await wait(100)
        trigger(query("#go-projects"), "click")
        await wait(200)
        await should(() => {
            // Element should be visible (opacity 1) after mount
            expect(opacityOf("#card1")).toBe(1)
        })
    })

    it("Triggers whileInView after remount (soft navigation)", async () => {
        // Start on projects page
        await visit(App)
        await wait(100)
        trigger(query("#go-projects"), "click")
        await wait(200)
        await should(() => {
            expect(opacityOf("#card1")).toBe(1)
        })

        // Navigate away (unmount)
        trigger(query("#go-home"), "click")
        await wait(100)

        // Navigate back (remount - simulates soft navigation)
        trigger(query("#go-projects"), "click")
        await wait(200)

        // Cards should animate again
        await should(() => {
            expect(opacityOf("#card1")).toBe(1)
        })
        await should(() => {
            expect(opacityOf("#card2")).toBe(1)
        })
    })

    it("Fires onViewportEnter after remount", async () => {
        // Start on projects page
        await visit(App)
        await wait(100)
        trigger(query("#go-projects"), "click")
        await wait(200)
        await should(() => {
            expect(query("#card1").dataset.inView).toBe("true")
        })

        // Navigate away
        trigger(query("#go-home"), "click")
        await wait(100)

        // Navigate back (remount)
        trigger(query("#go-projects"), "click")
        await wait(200)

        // onViewportEnter should fire again
        await should(() => {
            expect(query("#card1").dataset.inView).toBe("true")
        })
    })
})
