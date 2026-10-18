import type { JSX } from "@solidjs/web"
import { NoHydration } from "@solidjs/web"
import { createSignal } from "solid-js"
import { Reorder } from ".."

/**
 * Port note: server-rendered trees have to be exported from a `*.fixtures.tsx` module. `static`
 * renders them inside `<NoHydration>`, Solid's counterpart of `renderToStaticMarkup`.
 */
interface StaticProps {
    static?: boolean
}

function Markup(props: StaticProps & { children: () => JSX.Element }) {
    return props.static ? (
        <NoHydration>{props.children()}</NoHydration>
    ) : (
        props.children()
    )
}

export const Component = (props: StaticProps) => (
    <Markup static={props.static}>
        {() => (
            <Reorder.Group as="article" onReorder={() => {}} values={[]}>
                <Reorder.Item as="main" value={0} />
            </Reorder.Group>
        )}
    </Markup>
)

export const TypedComponent = (props: StaticProps) => {
    const [, setItems] = createSignal(["a"])
    return (
        <Markup static={props.static}>
            {() => (
                <Reorder.Group as="article" onReorder={setItems} values={[]}>
                    <Reorder.Item as="main" value={0} />
                </Reorder.Group>
            )}
        </Markup>
    )
}

export const CorrectComponent = () => (
    <Reorder.Group
        as="article"
        onReorder={() => {}}
        values={[]}
        class="test-class"
        id="test-id"
        style={{ color: "red" }}
        onClick={() => {}}
        data-testid="reorder-group"
    >
        <Reorder.Item
            as="main"
            value={0}
            class="item-class"
            id="item-id"
            style={{ margin: "10px" }}
            onClick={() => {}}
            data-testid="reorder-item"
        />
    </Reorder.Group>
)

// These incorrect prop types should cause TypeScript errors but currently don't
// The @ts-expect-error comments demonstrate the type system failure

// Group with incorrect prop types - these should be TypeScript errors
export const BadGroupComponent1 = () => (
    <Reorder.Group
        as="article"
        onReorder={() => {}}
        values={[]}
        // Port note: not a type error in Solid 2, whose `class` accepts numbers (`ClassValue`).
        // (Upstream: @ts-expect-error - className should be string, not number)
        class={1}
    >
        <Reorder.Item as="main" value={0} />
    </Reorder.Group>
)

export const BadGroupComponent2 = () => (
    <Reorder.Group
        as="article"
        onReorder={() => {}}
        values={[]}
        // @ts-expect-error - id should be string, not boolean
        id={true}
    >
        <Reorder.Item as="main" value={0} />
    </Reorder.Group>
)

export const BadGroupComponent3 = () => (
    <Reorder.Group
        as="article"
        onReorder={() => {}}
        values={[]}
        // @ts-expect-error - onClick should be function, not string
        onClick="test"
    >
        <Reorder.Item as="main" value={0} />
    </Reorder.Group>
)

// Item with incorrect prop types - these should be TypeScript errors
export const BadItemComponent1 = () => (
    <Reorder.Group as="article" onReorder={() => {}} values={[]}>
        <Reorder.Item
            as="main"
            value={0}
            // Port note: not a type error in Solid 2, whose `class` accepts numbers (`ClassValue`).
            // (Upstream: @ts-expect-error - className should be string, not number)
            class={1}
        />
    </Reorder.Group>
)

export const BadItemComponent2 = () => (
    <Reorder.Group as="article" onReorder={() => {}} values={[]}>
        <Reorder.Item
            as="main"
            value={0}
            // @ts-expect-error - style should be object, not string
            style="invalid-style"
        />
    </Reorder.Group>
)

export const BadItemComponent3 = () => (
    <Reorder.Group as="article" onReorder={() => {}} values={[]}>
        <Reorder.Item
            as="main"
            value={0}
            // @ts-expect-error - onClick should be function, not string
            onClick="test"
        />
    </Reorder.Group>
)
