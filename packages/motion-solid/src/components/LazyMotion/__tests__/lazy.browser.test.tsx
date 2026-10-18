import { render } from "@solidjs/testing-library"
import { domAnimation, domMax, LazyMotion, m } from "../../.."

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("LazyMotion", () => {
    test("m components animate with synchronously loaded features", async () => {
        const { container } = render(() => (
            <LazyMotion features={domAnimation}>
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.05 }}
                />
            </LazyMotion>
        ))
        const element = container.firstElementChild as HTMLElement
        expect(element.style.opacity).toBe("0")
        await vi.waitFor(() => expect(element.style.opacity).toBe("1"))
    })

    test("m components without LazyMotion render, but don't animate", async () => {
        const { container } = render(() => (
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        ))
        const element = container.firstElementChild as HTMLElement
        expect(element.style.opacity).toBe("0")
        await sleep(100)
        expect(element.style.opacity).toBe("0")
    })

    test("m components animate once asynchronously loaded features arrive, with variants", async () => {
        let load!: () => void
        const features = () =>
            new Promise<typeof domMax>((resolve) => {
                load = () => resolve(domMax)
            })

        const { container } = render(() => (
            <LazyMotion features={features}>
                <m.ul
                    initial="hidden"
                    animate="visible"
                    variants={{ hidden: {}, visible: {} }}
                >
                    <m.li
                        variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1 },
                        }}
                        transition={{ duration: 0.05 }}
                    />
                </m.ul>
            </LazyMotion>
        ))
        const li = container.querySelector("li")!
        expect(li.style.opacity).toBe("0")
        await sleep(50)
        expect(li.style.opacity).toBe("0")

        load()
        await vi.waitFor(() => expect(li.style.opacity).toBe("1"))
    })

    // Strict mode is covered by upstream's `lazy.test.tsx` (jsdom): motion-utils' `invariant`
    // only throws where `process.env.NODE_ENV` exists, which a browser bundle doesn't have.
})
