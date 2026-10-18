import { render } from "@solidjs/web"
import {
    createMemo,
    createRenderEffect,
    createSignal,
    flush,
    isPending,
    Loading,
    mapArray,
    onCleanup,
    onSettled,
    Show,
} from "solid-js"

/**
 * Contract tests for the Solid 2 scheduler behaviour that layout snapshots and presence rely on
 * (see PORTING.md). If a Solid release changes any of these, the layout/presence coordination
 * needs revisiting.
 */

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

function mount(app: () => any) {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const dispose = render(app, container)
    return {
        container,
        dispose: () => {
            dispose()
            container.remove()
        },
    }
}

/**
 * A computation whose previous run's cleanup logs the DOM it sees, like a layout trigger.
 */
function useRetireProbe(
    log: string[],
    name: string,
    read: () => number,
    getElement: () => HTMLElement | undefined
) {
    let run = 0
    createRenderEffect(
        () => {
            const value = read()
            const thisRun = ++run
            log.push(`${name}:compute ${value}`)
            onCleanup(() => {
                const element = getElement()
                log.push(
                    `${name}:cleanup ${value} retired=${run > thisRun} dom=${
                        element?.dataset.v
                    } connected=${element?.isConnected}`
                )
            })
            return value
        },
        (value) => {
            log.push(`${name}:apply ${value} dom=${getElement()?.dataset.v}`)
        }
    )
}

describe("Solid 2 scheduler contract", () => {
    test("a retired run's cleanup runs after every compute, before the DOM writes", () => {
        const log: string[] = []
        const [value, setValue] = createSignal(1)
        let a: HTMLElement | undefined
        let b: HTMLElement | undefined

        const Probe = (props: { name: string; v: number }) => {
            let element: HTMLElement | undefined
            useRetireProbe(
                log,
                props.name,
                () => props.v,
                () => element
            )
            return (
                <div
                    ref={(el) => {
                        element = el
                        if (props.name === "a") a = el
                        else b = el
                    }}
                    data-v={props.v}
                />
            )
        }

        const { dispose } = mount(() => (
            <>
                <Probe name="a" v={value()} />
                <Probe name="b" v={value() * 10} />
            </>
        ))
        flush()
        log.length = 0

        setValue(2)
        flush()

        expect(log).toEqual([
            "a:compute 2",
            "b:compute 20",
            "a:cleanup 1 retired=true dom=1 connected=true",
            "b:cleanup 10 retired=true dom=10 connected=true",
            "a:apply 2 dom=1",
            "b:apply 20 dom=10",
        ])
        expect(a!.dataset.v).toBe("2")
        expect(b!.dataset.v).toBe("20")
        dispose()
    })

    test("a removed branch is disposed after the computes, while still in the document", () => {
        const log: string[] = []
        const [show, setShow] = createSignal(true)
        const [value, setValue] = createSignal(1)

        const Child = () => {
            let element!: HTMLElement
            onCleanup(() =>
                log.push(`child:dispose connected=${element.isConnected}`)
            )
            return <span ref={element} />
        }

        const { dispose } = mount(() => (
            <div>
                <Show when={show()}>
                    <Child />
                </Show>
                {(() => {
                    useRetireProbe(log, "probe", value, () => undefined)
                    return null
                })()}
            </div>
        ))
        flush()
        log.length = 0

        setShow(false)
        setValue(2)
        flush()

        expect(log[0]).toBe("probe:compute 2")
        expect(log).toContain("child:dispose connected=true")
        expect(log.indexOf("child:dispose connected=true")).toBeLessThan(
            log.indexOf("probe:apply 2 dom=undefined")
        )
        dispose()
    })

    test("held by async, cleanups and DOM writes wait for the landing", async () => {
        const log: string[] = []
        const [id, setId] = createSignal(1)
        let resolve!: (value: string) => void
        const data = createMemo(() =>
            id() === 1 ? "one" : new Promise<string>((done) => (resolve = done))
        )
        let element: HTMLElement | undefined

        const Probe = (props: { v: number }) => {
            useRetireProbe(
                log,
                "probe",
                () => props.v,
                () => element
            )
            return <div ref={(el) => (element = el)} data-v={props.v} />
        }

        const { dispose } = mount(() => (
            <>
                <Probe v={id()} />
                <Loading fallback="loading">
                    <span>{data()}</span>
                </Loading>
            </>
        ))
        await tick()
        flush()
        log.length = 0

        setId(2)
        flush()
        await tick()
        flush()

        // Computed right away, but nothing committed.
        expect(log).toEqual(["probe:compute 2"])
        expect(element!.dataset.v).toBe("1")

        resolve("two")
        await tick()
        flush()

        expect(log).toEqual([
            "probe:compute 2",
            "probe:cleanup 1 retired=true dom=1 connected=true",
            "probe:apply 2 dom=1",
        ])
        expect(element!.dataset.v).toBe("2")
        dispose()
    })

    test("a superseded speculative run's cleanup is not a retirement", async () => {
        const log: string[] = []
        const [id, setId] = createSignal(1)
        const resolvers = new Map<number, (value: string) => void>()
        const data = createMemo(() => {
            const current = id()
            return current === 1
                ? "one"
                : new Promise<string>((done) => resolvers.set(current, done))
        })
        let element: HTMLElement | undefined

        const Probe = (props: { v: number }) => {
            useRetireProbe(
                log,
                "probe",
                () => props.v,
                () => element
            )
            return <div ref={(el) => (element = el)} data-v={props.v} />
        }

        const { dispose } = mount(() => (
            <>
                <Probe v={id()} />
                <Loading fallback="loading">
                    <span>{data()}</span>
                </Loading>
            </>
        ))
        await tick()
        flush()
        log.length = 0

        setId(2)
        flush()
        setId(3)
        flush()
        resolvers.get(3)!("three")
        await tick()
        flush()

        const retirements = log.filter((line) => line.includes("retired=true"))
        expect(retirements).toEqual([
            "probe:cleanup 1 retired=true dom=1 connected=true",
        ])
        expect(log).not.toContain(
            "probe:cleanup 2 retired=true dom=1 connected=true"
        )
        expect(element!.dataset.v).toBe("3")
        dispose()
    })

    test("mapArray keeps an item's owner while it's in the list, and reuses it", () => {
        const log: string[] = []
        const [items, setItems] = createSignal([1, 2])
        let created = 0

        const { dispose } = mount(() => {
            const mapped = mapArray(items, (item) => {
                created++
                onCleanup(() => log.push(`dispose ${item}`))
                return <span>{item}</span>
            })
            return <>{mapped()}</>
        })
        flush()
        expect(created).toBe(2)

        setItems([1])
        flush()
        expect(log).toEqual(["dispose 2"])

        setItems([1, 2])
        flush()
        expect(created).toBe(3)
        dispose()
    })

    test("onSettled runs once the element is in the document", () => {
        const log: string[] = []
        const [show, setShow] = createSignal(false)

        const Child = () => {
            let element!: HTMLElement
            onSettled(() => {
                log.push(`settled connected=${element.isConnected}`)
            })
            return <span ref={element} />
        }

        const { dispose } = mount(() => (
            <Show when={show()}>
                <Child />
            </Show>
        ))
        flush()

        setShow(true)
        flush()
        expect(log).toEqual(["settled connected=true"])
        dispose()
    })

    test("onSettled order: parent before child", () => {
        const log: string[] = []

        const Node = (props: { name: string; children?: any }) => {
            onSettled(() => {
                log.push(props.name)
            })
            return <div>{props.children}</div>
        }

        const { dispose } = mount(() => (
            <Node name="parent">
                <Node name="child" />
            </Node>
        ))
        flush()

        expect(log).toEqual(["parent", "child"])
        dispose()
    })

    /**
     * Known Solid 2 issue (RC.13 to RC.15), not a contract we rely on: a computation that also reads
     * `isPending` of the held async value is applied with the held values only after the
     * transition's DOM writes (it first applies `pending=false` with the old value), so a layout
     * trigger in it can't snapshot before the change: a `layout` component reading `isPending`
     * in its props jumps instead of animating. Expected to start passing once Solid fixes it.
     */
    it.fails(
        "a computation reading isPending applies held values before the DOM writes",
        async () => {
            const [n, setN] = createSignal(1)
            const data = createMemo(() => {
                const v = n()
                if (v === 1) return v
                return new Promise<number>((resolve) =>
                    setTimeout(() => resolve(v), 30)
                )
            })
            const log: string[] = []

            function Probe() {
                const state = createMemo(() => ({
                    n: n(),
                    pending: isPending(() => data()),
                }))
                createRenderEffect(state, (value) => {
                    log.push(
                        `n=${value.n} dom=${
                            document.querySelector<HTMLElement>("#held")
                                ?.textContent
                        }`
                    )
                })
                return null
            }

            const { dispose } = mount(() => (
                <Loading>
                    <Probe />
                    <Loading fallback="fallback">
                        <div id="held">{data()}</div>
                    </Loading>
                </Loading>
            ))
            flush()
            setN(3)
            flush()
            await new Promise((resolve) => setTimeout(resolve, 100))

            expect(log).toContain("n=3 dom=1")
            dispose()
        }
    )
})
