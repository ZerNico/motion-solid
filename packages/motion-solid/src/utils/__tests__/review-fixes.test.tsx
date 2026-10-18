import { createSignal, flush, type Accessor } from "solid-js"
import { render } from "../../jest.setup"
import { useInView } from "../use-in-view"
import { getActiveObserver } from "./mock-intersection-observer"

const enter = (target: Element) => {
    getActiveObserver()?.([{ target, isIntersecting: true }])
    flush()
}

describe("useInView refs", () => {
    test("observes a plain `let` ref", () => {
        let isInView!: Accessor<boolean>
        let element!: HTMLDivElement

        render(() => {
            isInView = useInView(() => element)
            return <div ref={element} />
        })

        expect(getActiveObserver()).toBeDefined()
        enter(element)
        expect(isInView()).toBe(true)
    })

    test("observes a `{ current }` ref", () => {
        let isInView!: Accessor<boolean>
        const ref: { current: HTMLDivElement | null } = { current: null }

        render(() => {
            isInView = useInView(ref)
            return <div ref={(el) => (ref.current = el)} />
        })

        expect(getActiveObserver()).toBeDefined()
        enter(ref.current!)
        expect(isInView()).toBe(true)
    })

    test("resets when the ref switches to another element or null", () => {
        const a = document.createElement("div")
        const b = document.createElement("div")
        const [element, setElement] = createSignal<Element | null>(a)
        let isInView!: Accessor<boolean>

        render(() => {
            isInView = useInView(element)
            return null
        })

        enter(a)
        expect(isInView()).toBe(true)

        setElement(b)
        flush()
        expect(isInView()).toBe(false)
        enter(b)
        expect(isInView()).toBe(true)

        setElement(null)
        flush()
        expect(isInView()).toBe(false)
        expect(getActiveObserver()).toBeUndefined()
    })

    test("a `once` ref stays in view when it switches", () => {
        const a = document.createElement("div")
        const b = document.createElement("div")
        const [element, setElement] = createSignal<Element | null>(a)
        let isInView!: Accessor<boolean>

        render(() => {
            isInView = useInView(element, { once: true })
            return null
        })

        enter(a)
        expect(isInView()).toBe(true)
        setElement(b)
        flush()
        expect(isInView()).toBe(true)
    })
})
