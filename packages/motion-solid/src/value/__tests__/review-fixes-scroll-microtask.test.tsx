import { microtask, supportsFlags } from "motion-dom"
import { render } from "../../jest.setup"
import { useScroll } from "../use-scroll"

/**
 * Kept in its own file: before the fix, this stalled motion-dom's global microtask batcher for
 * every later test in the file.
 */
describe("useScroll acceleration with a pending ref", () => {
    afterEach(() => {
        supportsFlags.scrollTimeline = undefined
    })

    test("doesn't stall motion-dom's microtask batcher while the ref is pending", async () => {
        supportsFlags.scrollTimeline = true

        const container: { current: HTMLElement | null } = { current: null }
        let accelerate: any

        render(() => {
            accelerate = useScroll({ container }).scrollYProgress.accelerate
            return null
        })

        const attachTimeline = vi.fn(() => () => {})
        const stop = accelerate.factory({ attachTimeline })

        // Let the factory's first attempt run (and find the ref pending).
        await new Promise((resolve) => setTimeout(resolve, 20))

        const job = vi.fn()
        microtask.read(job)
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(job).toHaveBeenCalledTimes(1)

        // Once the ref resolves, the timeline is attached.
        container.current = document.createElement("div")
        await vi.waitFor(() => expect(attachTimeline).toHaveBeenCalledTimes(1))

        stop()
    })

    test("a pending start is cancelled with the acceleration", async () => {
        supportsFlags.scrollTimeline = true

        const container: { current: HTMLElement | null } = { current: null }
        let accelerate: any

        render(() => {
            accelerate = useScroll({ container }).scrollYProgress.accelerate
            return null
        })

        const attachTimeline = vi.fn(() => () => {})
        const stop = accelerate.factory({ attachTimeline })
        await new Promise((resolve) => setTimeout(resolve, 20))
        stop()

        container.current = document.createElement("div")
        await new Promise((resolve) => setTimeout(resolve, 50))
        expect(attachTimeline).not.toHaveBeenCalled()
    })
})
