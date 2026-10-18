/**
 * Port of upstream's `cypress/integration/start-transition-suspense.ts` and its page,
 * `dev/react/src/tests/start-transition-suspense.tsx` (harness: `start-transition-helpers.tsx`).
 *
 * Port note: `Suspense` is `<Loading>`, and a component that throws a cached promise reads an
 * async memo instead (the same 400ms cache). The concurrent modes are translated as described in
 * `start-transition-helpers.tsx`, without the slow render (this page has none).
 */
import type { JSX } from "@solidjs/web"
import { createMemo, createSignal, isPending, Loading, Show } from "solid-js"
import { LayoutGroup, motion } from "../../src"
import {
    analyze,
    click,
    configure,
    deferred,
    duration,
    expectCloseTo,
    harness,
    linear,
    log,
    type Mode,
    runScript,
    update,
    useCommitLog,
    waitForDone,
} from "./start-transition-helpers"
import { nextFrame, query, visit } from "./utils"

type Scenario = "swap" | "expand" | "expandGroup"

const heights: Record<number, number> = { 1: 100, 2: 300 }

const scenarios: Record<Scenario, Array<[number, () => void]>> = {
    swap: [[100, click("next")]],
    expand: [[100, click("expand")]],
    expandGroup: [[100, click("expand")]],
}

function App(props: { mode: Mode; scenario: Scenario }) {
    configure({ mode: props.mode })
    const scenario = props.scenario
    const group = scenario === "expandGroup"

    const cache = new Map<number, Promise<boolean> | true>()
    cache.set(1, true)

    function read(id: number) {
        let entry = cache.get(id)
        if (!entry) {
            entry = new Promise<boolean>((resolve) =>
                setTimeout(() => {
                    cache.set(id, true)
                    log("resolved", id)
                    resolve(true)
                }, 400)
            )
            cache.set(id, entry)
        }
        return entry
    }

    const Wrapper = (wrapperProps: {
        id?: string
        height: number
        children: JSX.Element
    }) =>
        group ? (
            <motion.div
                id={wrapperProps.id}
                layout
                style={{ height: wrapperProps.height }}
            >
                {wrapperProps.children}
            </motion.div>
        ) : (
            <div
                id={wrapperProps.id}
                style={{ height: `${wrapperProps.height}px` }}
            >
                {wrapperProps.children}
            </div>
        )

    function Details(detailsProps: { id: number }) {
        const ready = createMemo(() => read(detailsProps.id))
        useCommitLog("details", () => (ready(), detailsProps.id))
        return (
            <Wrapper
                id={`details-${detailsProps.id}`}
                height={heights[detailsProps.id]}
            >
                <span data-ready={String(ready())}>
                    details {detailsProps.id}
                </span>
            </Wrapper>
        )
    }

    const Fallback = () => {
        useCommitLog("fallback", () => true)
        return <Wrapper height={50}>loading</Wrapper>
    }

    const [id, setId] = createSignal(1)
    const [expanded, setExpanded] = createSignal(false)
    const renderedId = deferred(id, false)
    const renderedExpanded = deferred(expanded, false)
    useCommitLog("card", () => ({
        renderedId: renderedId(),
        renderedExpanded: renderedExpanded(),
        isPending: isPending(() => renderedId()),
    }))

    return (
        <Loading>
            <div style={{ padding: "20px" }}>
                <button id="run" onClick={() => runScript(scenarios[scenario])}>
                    run
                </button>
                <button id="next" onClick={() => update(() => setId(2), false)}>
                    next
                </button>
                <button
                    id="expand"
                    onClick={() => update(() => setExpanded(true), false)}
                >
                    expand
                </button>
                <LayoutGroup>
                    <motion.div
                        id="card"
                        data-track="card"
                        layout
                        /**
                         * Port note: upstream's card re-renders with App, which snapshots it.
                         * In Solid, its size changes from a plain child, so it declares what
                         * that depends on (PORTING.md: `layoutDependency`).
                         */
                        layoutDependency={`${renderedId()}-${renderedExpanded()}`}
                        transition={{ layout: { ...linear, duration } }}
                        style={{
                            width: 200,
                            background: "#ccc",
                            overflow: "hidden",
                        }}
                    >
                        {scenario === "swap" ? (
                            <Loading fallback={<Fallback />}>
                                <Details id={renderedId()} />
                            </Loading>
                        ) : (
                            <>
                                <div style={{ height: "100px" }}>header</div>
                                <Show when={renderedExpanded()}>
                                    <Loading fallback={<Fallback />}>
                                        <Details id={2} />
                                    </Loading>
                                </Show>
                            </>
                        )}
                    </motion.div>
                </LayoutGroup>
            </div>
        </Loading>
    )
}

async function run(scenario: Scenario, mode: Mode) {
    await visit(App, { mode, scenario })
    await nextFrame()
    await nextFrame()
    query("#run").click()
    await waitForDone()
}

const analyzeCard = (to: number) =>
    analyze({
        name: "card",
        axis: "h",
        from: 0,
        to,
        after: harness.events.find((e) => e.type === "click")!.t,
        jumpFraction: 0.2,
    })

/**
 * Wait (re-querying) for the card to reach its final height.
 */
const settled = (to: number) =>
    vi.waitFor(() => expectCloseTo(analyzeCard(to).finalProgress, 1, 0.01), {
        timeout: 10000,
        interval: 16,
    })

const fallbackShown = () =>
    harness.events.some(
        (e) => e.type === "commit" && e.data.label === "fallback"
    )

/**
 * Port note: upstream's known limitations, skipped unless run with `--env known=1` (React doesn't
 * re-render the `layout` ancestor when it reveals suspended content, so the card jumps).
 */
const knownLimitations = [
    "swap sync",
    "expand sync",
    "expand transition",
    "expand useTransition",
    "expand deferred",
]
const test = (key: string) => (knownLimitations.includes(key) ? it.skip : it)

describe("Concurrent React: Suspense", () => {
    for (const mode of [
        "sync",
        "transition",
        "useTransition",
        "deferred",
    ] as const) {
        test(`swap ${mode}`)(
            `swap (${mode}) visible boundary suspends: card animates to revealed content`,
            async () => {
                await run("swap", mode)
                await settled(200)
                const card = analyzeCard(200)
                expect(card.jumps).toBe(0)
                expect(card.animatedMs).toBeGreaterThan(250)
                if (mode !== "sync") expect(fallbackShown()).toBe(false)
            },
            30000
        )

        test(`expand ${mode}`)(
            `expand (${mode}) new boundary suspends: card animates to revealed content`,
            async () => {
                await run("expand", mode)
                await settled(300)
                expect(analyzeCard(300).jumps).toBe(0)
            },
            30000
        )
    }

    for (const mode of ["sync", "transition"] as const) {
        it(`expandGroup (${mode}) LayoutGroup + layout fallback animates the reveal`, async () => {
            await run("expandGroup", mode)
            await settled(300)
            expect(analyzeCard(300).jumps).toBe(0)
        }, 30000)
    }
})
