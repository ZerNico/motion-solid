/**
 * Port of upstream's `cypress/integration/reorder-virtualized.ts` and its page,
 * `dev/react/src/tests/reorder-virtualized.tsx`.
 *
 * Port note: upstream uses `@tanstack/react-virtual`'s `useVirtualizer`. This page has a minimal
 * equivalent (`createVirtualizer`) with the same range for fixed-size items: the items
 * overlapping the scroll element's viewport (overscan 0).
 */
import { createMemo, createSignal, For, Show } from "solid-js"
import { Reorder } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

const ITEM_HEIGHT = 50
const allItems = Array.from({ length: 50 }, (_, i) => `Item ${i}`)

interface VirtualItem {
    index: number
    start: number
    end: number
}

function createVirtualizer(options: {
    count: () => number
    size: number
    viewport: number
}) {
    const [scrollTop, setScrollTop] = createSignal(0)
    const virtualItems = createMemo<VirtualItem[]>(() => {
        const count = options.count()
        if (!count) return []
        const top = scrollTop()
        const startIndex = Math.min(
            count - 1,
            Math.max(0, Math.floor(top / options.size))
        )
        let endIndex = startIndex
        while (
            endIndex < count - 1 &&
            (endIndex + 1) * options.size < top + options.viewport
        ) {
            endIndex++
        }
        const result: VirtualItem[] = []
        for (let index = startIndex; index <= endIndex; index++) {
            result.push({
                index,
                start: index * options.size,
                end: (index + 1) * options.size,
            })
        }
        return result
    })
    return {
        virtualItems,
        getTotalSize: () => options.count() * options.size,
        onScroll: (event: Event) =>
            setScrollTop((event.currentTarget as HTMLElement).scrollTop),
    }
}

function App() {
    const [items, setItems] = createSignal(allItems)

    const virtualizer = createVirtualizer({
        count: () => items().length,
        size: ITEM_HEIGHT,
        viewport: 300,
    })

    const virtualItems = virtualizer.virtualItems

    // Spacer heights to maintain correct scroll area
    const paddingTop = () =>
        virtualItems().length > 0 ? virtualItems()[0].start : 0
    const paddingBottom = () =>
        virtualItems().length > 0
            ? virtualizer.getTotalSize() -
              virtualItems()[virtualItems().length - 1].end
            : 0

    const visible = () =>
        virtualItems().map((virtualItem) => ({
            item: items()[virtualItem.index],
            index: virtualItem.index,
        }))

    return (
        <div>
            <div
                style={{ height: "300px", overflow: "auto" }}
                onScroll={virtualizer.onScroll}
            >
                <Reorder.Group
                    axis="y"
                    values={items()}
                    onReorder={setItems}
                    style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                    }}
                >
                    <Show when={paddingTop() > 0}>
                        <li
                            style={{
                                height: `${paddingTop()}px`,
                                padding: "0px",
                                border: "none",
                            }}
                        />
                    </Show>
                    <For each={visible()} keyed={(entry) => entry.item}>
                        {(entry) => (
                            <Reorder.Item
                                value={entry().item}
                                id={entry().item.replace(/\s/g, "-")}
                                style={{
                                    height: ITEM_HEIGHT,
                                    padding: "10px",
                                    boxSizing: "border-box",
                                    background: `hsl(${
                                        (entry().index * 7.2) % 360
                                    }, 80%, 90%)`,
                                    borderBottom: "1px solid rgba(0,0,0,0.1)",
                                    cursor: "grab",
                                }}
                            >
                                {entry().item}
                            </Reorder.Item>
                        )}
                    </For>
                    <Show when={paddingBottom() > 0}>
                        <li
                            style={{
                                height: `${paddingBottom()}px`,
                                padding: "0px",
                                border: "none",
                            }}
                        />
                    </Show>
                </Reorder.Group>
            </div>
            {/* Expose state for assertions */}
            <p id="item-count" data-count={items().length}>
                {items().length} items
            </p>
            <p id="item-order" data-order={JSON.stringify(items())}>
                {items().join(", ")}
            </p>
            <p id="visible-count" data-count={virtualItems().length}>
                {virtualItems().length} visible
            </p>
        </div>
    )
}

describe("Reorder with virtualized list (@tanstack/react-virtual)", () => {
    it("Preserves all items after reorder", async () => {
        await visit(App)
        await wait(200)
        // Verify initial state — 50 items, only a subset visible
        await should(() =>
            expect(query("#item-count").getAttribute("data-count")).toBe("50")
        )
        const visible = parseInt(
            query("#visible-count").getAttribute("data-count")!
        )
        expect(visible).toBeLessThan(50)
        expect(visible).toBeGreaterThan(0)

        // Drag Item 1 down past Item 2
        const item = query("#Item-1")
        await nextFrame()
        await nextFrame()
        trigger(item, "pointerdown", { x: 50, y: 25, force: true })
        await wait(50)
        trigger(item, "pointermove", { x: 50, y: 30, force: true })
        await nextFrame()
        await wait(50)
        trigger(item, "pointermove", { x: 50, y: 55, force: true })
        await nextFrame()
        await wait(100)
        trigger(item, "pointerup", { x: 50, y: 55, force: true })
        await wait(200)

        // After reorder: all 50 items must still be present
        await should(() =>
            expect(query("#item-count").getAttribute("data-count")).toBe("50")
        )
        await should(() => {
            const order: string[] = JSON.parse(
                query("#item-order").getAttribute("data-order")!
            )
            // All 50 items still present — none lost to virtualization
            expect(order).toHaveLength(50)
            const sorted = [...order].sort()
            const expected = Array.from(
                { length: 50 },
                (_, i) => `Item ${i}`
            ).sort()
            expect(sorted).toEqual(expected)
            // Item 1 is no longer at index 1 (it was dragged)
            expect(order[1]).not.toBe("Item 1")
            // Unmeasured items at the end are still there
            expect(order).toContain("Item 49")
        })
    })
})
