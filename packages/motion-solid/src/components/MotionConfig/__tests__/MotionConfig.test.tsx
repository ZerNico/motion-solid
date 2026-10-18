import { AnimationGeneratorName, Transition } from "motion-dom"
import { createSignal, flush, useContext } from "solid-js"
// Port note: `render` from `jest.setup` (Solid's testing-library, takes a function).
import { render } from "../../../jest.setup"
import { MotionConfig } from ".."
import { MotionConfigContext } from "../../../context/MotionConfigContext"

const consumerId = "consumer"

const Consumer = () => {
    const value = useContext(MotionConfigContext)
    return (
        <div data-testid={consumerId}>{value.transition!.type as string}</div>
    )
}

const TransitionConsumer = () => {
    const value = useContext(MotionConfigContext)
    return (
        <div data-testid={consumerId}>{JSON.stringify(value.transition)}</div>
    )
}

const App = (props: { type: AnimationGeneratorName }) => (
    <MotionConfig transition={{ type: props.type }}>
        <Consumer />
    </MotionConfig>
)

it("Passes down transition", () => {
    const { getByTestId } = render(() => <App type="spring" />)

    expect(getByTestId(consumerId).textContent).toBe("spring")
})

it("Passes down transition changes", () => {
    const [type, setType] = createSignal<AnimationGeneratorName>("spring")
    const { getByTestId } = render(() => <App type={type()} />)
    setType("tween")
    flush()

    expect(getByTestId(consumerId).textContent).toBe("tween")
})

it("Nested MotionConfig without inherit fully replaces parent transition", () => {
    const { getByTestId } = render(() => (
        <MotionConfig transition={{ type: "spring", duration: 1 }}>
            <MotionConfig transition={{ delay: 0.5 }}>
                <TransitionConsumer />
            </MotionConfig>
        </MotionConfig>
    ))

    const transition: Transition = JSON.parse(
        getByTestId(consumerId).textContent!
    )
    expect(transition.delay).toBe(0.5)
    expect(transition.type).toBeUndefined()
    expect(transition.duration).toBeUndefined()
})

it("Nested MotionConfig with inherit shallow-merges with parent transition", () => {
    const { getByTestId } = render(() => (
        <MotionConfig transition={{ type: "spring", duration: 1 }}>
            <MotionConfig transition={{ inherit: true, delay: 0.5 }}>
                <TransitionConsumer />
            </MotionConfig>
        </MotionConfig>
    ))

    const transition: Transition = JSON.parse(
        getByTestId(consumerId).textContent!
    )
    expect(transition.type).toBe("spring")
    expect(transition.duration).toBe(1)
    expect(transition.delay).toBe(0.5)
})

it("inherit key is stripped from resulting transition", () => {
    const { getByTestId } = render(() => (
        <MotionConfig transition={{ type: "spring" }}>
            <MotionConfig transition={{ inherit: true, delay: 0.5 }}>
                <TransitionConsumer />
            </MotionConfig>
        </MotionConfig>
    ))

    const transition: Transition = JSON.parse(
        getByTestId(consumerId).textContent!
    )
    expect(transition).not.toHaveProperty("inherit")
})

it("inherit inner keys win over parent keys", () => {
    const { getByTestId } = render(() => (
        <MotionConfig transition={{ type: "spring", duration: 1 }}>
            <MotionConfig
                transition={{ inherit: true, duration: 2, delay: 0.5 }}
            >
                <TransitionConsumer />
            </MotionConfig>
        </MotionConfig>
    ))

    const transition: Transition = JSON.parse(
        getByTestId(consumerId).textContent!
    )
    expect(transition.type).toBe("spring")
    expect(transition.duration).toBe(2)
    expect(transition.delay).toBe(0.5)
})

it("inherit cascades through deeply nested MotionConfigs", () => {
    const { getByTestId } = render(() => (
        <MotionConfig transition={{ type: "spring", duration: 1 }}>
            <MotionConfig transition={{ inherit: true, delay: 0.5 }}>
                <MotionConfig transition={{ inherit: true, ease: "easeIn" }}>
                    <TransitionConsumer />
                </MotionConfig>
            </MotionConfig>
        </MotionConfig>
    ))

    const transition: Transition = JSON.parse(
        getByTestId(consumerId).textContent!
    )
    expect(transition.type).toBe("spring")
    expect(transition.duration).toBe(1)
    expect(transition.delay).toBe(0.5)
    expect(transition.ease).toBe("easeIn")
})
