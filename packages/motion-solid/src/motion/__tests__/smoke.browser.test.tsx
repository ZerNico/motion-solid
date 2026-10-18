import { render } from "@solidjs/testing-library"
import { createSignal, flush, For, Show } from "solid-js"
import { motion } from "../.."

describe("motion component (smoke)", () => {
    test("renders the element with initial styles", () => {
        const { container } = render(() => (
            <motion.div
                data-testid="box"
                class="box"
                initial={{ opacity: 0, x: 10 }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        expect(element.tagName).toBe("DIV")
        expect(element.className).toBe("box")
        expect(element.dataset.testid).toBe("box")
        expect(element.style.opacity).toBe("0")
        expect(element.style.transform).toBe("translateX(10px)")
        expect(element.hasAttribute("initial")).toBe(false)
    })

    test("animates to `animate`", async () => {
        const onComplete = vi.fn()
        const { container } = render(() => (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.05 }}
                onAnimationComplete={onComplete}
            />
        ))
        const element = container.firstElementChild as HTMLElement

        await vi.waitFor(() => expect(onComplete).toHaveBeenCalled())
        expect(element.style.opacity).toBe("1")
    })

    test("animates when `animate` changes", async () => {
        const [x, setX] = createSignal(0)
        const { container } = render(() => (
            <motion.div animate={{ x: x() }} transition={{ duration: 0.05 }} />
        ))
        const element = container.firstElementChild as HTMLElement

        setX(100)
        flush()

        await vi.waitFor(() =>
            expect(element.style.transform).toBe("translateX(100px)")
        )
    })

    test("propagates variants to children", async () => {
        const onComplete = vi.fn()
        const [variant, setVariant] = createSignal("hidden")
        const { container } = render(() => (
            <motion.ul
                initial="hidden"
                animate={variant()}
                variants={{ hidden: {}, visible: {} }}
            >
                <motion.li
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1 },
                    }}
                    transition={{ duration: 0.05 }}
                    onAnimationComplete={onComplete}
                />
            </motion.ul>
        ))
        const li = container.querySelector("li")!
        expect(li.style.opacity).toBe("0")

        setVariant("visible")
        flush()

        await vi.waitFor(() => expect(li.style.opacity).toBe("1"))
    })

    test("staggers children on mount", async () => {
        const { container } = render(() => (
            <motion.ul
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.15 } },
                }}
            >
                <For each={[0, 1, 2]}>
                    {() => (
                        <motion.li
                            variants={{
                                hidden: { opacity: 0 },
                                visible: { opacity: 1 },
                            }}
                            transition={{ duration: 0.01 }}
                        />
                    )}
                </For>
            </motion.ul>
        ))
        const items = Array.from(container.querySelectorAll("li"))

        await vi.waitFor(() => expect(items[0].style.opacity).toBe("1"))
        expect(items[2].style.opacity).toBe("0")
        await vi.waitFor(() => expect(items[2].style.opacity).toBe("1"))
    })

    test("a child added later animates to its parent's variant", async () => {
        const [show, setShow] = createSignal(false)
        const { container } = render(() => (
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: {} }}
            >
                <Show when={show()}>
                    <motion.span
                        variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1 },
                        }}
                        transition={{ duration: 0.05 }}
                    />
                </Show>
            </motion.div>
        ))

        await new Promise((resolve) => setTimeout(resolve, 50))
        setShow(true)
        flush()
        const span = container.querySelector("span")!
        expect(span.style.opacity).toBe("0")
        await vi.waitFor(() => expect(span.style.opacity).toBe("1"))
    })

    test("reads kebab-case and camelCase style keys", () => {
        const { container } = render(() => (
            <motion.div
                style={{ "background-color": "red", width: 100, x: 5 }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        expect(element.style.backgroundColor).toBe("red")
        expect(element.style.width).toBe("100px")
        expect(element.style.transform).toBe("translateX(5px)")
    })
})
