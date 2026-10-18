/**
 * Port of upstream's `cypress/integration/drag-snap-layout-id-swap.ts` and its page,
 * `dev/react/src/tests/drag-snap-layout-id-swap.tsx`.
 */
import { createSignal, For } from "solid-js"
import { motion } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * Regression test for issue #3315.
 *
 * Tiles use `drag` + `dragSnapToOrigin` + `layoutId` with absolute
 * `top`/`left` positioning. When two same-row tiles swap, React 19's
 * reorder reconciliation briefly unmounts and remounts the dragged tile.
 * The visual element's unmount used to call `value.stop()` on its owned
 * motion values, killing the in-flight dragSnapToOrigin animation and
 * leaving the drag transform stranded — so the tile would render at its
 * new layout position PLUS the drag offset.
 */

const TILES_PER_ROW = 3
const TILE_SIZE = 60
const GRID_SIZE = TILE_SIZE * TILES_PER_ROW

type Position = { x: number; y: number }
type Info = { offset: { x: number; y: number } }

function App() {
    const [tiles, setTiles] = createSignal<{ id: number }[][]>(
        (() => {
            const t: { id: number }[][] = []
            for (let i = 0; i < TILES_PER_ROW; i++) {
                const r: { id: number }[] = []
                for (let j = 0; j < TILES_PER_ROW; j++) {
                    r.push({ id: i * TILES_PER_ROW + j })
                }
                t.push(r)
            }
            return t
        })()
    )

    const handleDragEnd = (draggedPos: Position, info: Info) => {
        const dropX = draggedPos.x + Math.round(info.offset.x / TILE_SIZE)
        const dropY = draggedPos.y + Math.round(info.offset.y / TILE_SIZE)
        if (
            dropX < 0 ||
            dropX >= TILES_PER_ROW ||
            dropY < 0 ||
            dropY >= TILES_PER_ROW ||
            (draggedPos.x === dropX && draggedPos.y === dropY)
        ) {
            return
        }
        const current = tiles()
        const newTiles = current.map((row) => [...row])
        newTiles[dropY][dropX] = current[draggedPos.y][draggedPos.x]
        newTiles[draggedPos.y][draggedPos.x] = current[dropY][dropX]
        setTiles(newTiles)
    }

    /**
     * Port note: upstream's nested `map`s render a flat list of tiles keyed by `tile.id`.
     */
    const flatTiles = () =>
        tiles().flatMap((r, y) =>
            r.map((tile, x) => ({ tile, position: { x, y } }))
        )

    return (
        <div style={{ padding: "50px" }}>
            <div
                id="grid"
                data-tile-state={tiles()
                    .map((row) => row.map((t) => t.id).join(","))
                    .join("|")}
                style={{
                    border: "solid 1px black",
                    width: `${GRID_SIZE}px`,
                    height: `${GRID_SIZE}px`,
                    position: "relative",
                }}
            >
                <For each={flatTiles()} keyed={(entry) => entry.tile.id}>
                    {(entry) => (
                        <Tile
                            position={entry().position}
                            tile={entry().tile}
                            id={entry().tile.id}
                            onDragEnd={handleDragEnd}
                        />
                    )}
                </For>
            </div>
        </div>
    )
}

function Tile(props: {
    tile: { id: number }
    position: Position
    id: number
    onDragEnd: (pos: Position, info: Info) => void
}) {
    const [isDragging, setIsDragging] = createSignal(false)
    return (
        <motion.div
            data-testid={`tile-${props.id}`}
            style={{
                position: "absolute",
                border: "solid 1px black",
                width: TILE_SIZE,
                height: TILE_SIZE,
                top: props.position.y * TILE_SIZE,
                left: props.position.x * TILE_SIZE,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#fff",
                zIndex: isDragging() ? 1 : 0,
            }}
            layoutId={String(props.tile.id)}
            onAnimationComplete={() => setIsDragging(false)}
            onAnimationStart={() => setIsDragging(true)}
            drag
            dragSnapToOrigin
            onDragEnd={(_, info) => props.onDragEnd(props.position, info)}
            whileDrag={{ zIndex: 1 }}
        >
            {props.id}
        </motion.div>
    )
}

const closeTo = (actual: number, expected: number, delta: number) =>
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(delta)

/**
 * Regression test for issue #3315.
 *
 * Tiles use `drag` + `dragSnapToOrigin` + `layoutId` in an absolutely-
 * positioned grid. When same-row tiles swap, React 19's reorder
 * reconciliation briefly unmounts and remounts the dragged component;
 * if the VisualElement's unmount cancels in-flight motion-value
 * animations, the dragSnapToOrigin animation dies before remount can
 * resubscribe and the tile renders at "new layout + stranded drag offset".
 *
 * Note: The bug only manifests under React 19's reconciliation. The Cypress
 * runner targets the React 19 dev app (`cypress.react-19.json`), so the
 * regression gate is on that config; the React 18 run passes either way.
 */
describe("drag + dragSnapToOrigin + layoutId horizontal swap", () => {
    it("does not strand the drag transform after a same-row swap", async () => {
        await visit(App)
        await wait(200)
        const tile0 = query('[data-testid="tile-0"]')
        await should(() => {
            const r = tile0.getBoundingClientRect()
            closeTo(r.left, 50, 2)
            closeTo(r.top, 50, 2)
        })
        // Drag tile-0 right ~60px (one column) onto tile-1's slot.
        // Pointermoves are element-relative; we keep the move small so
        // the recomputed-as-element-moves coordinate system still lands
        // the pointer on tile-1.
        await nextFrame()
        await nextFrame()
        trigger(tile0, "pointerdown", { x: 5, y: 5, force: true })
        trigger(tile0, "pointermove", { x: 10, y: 5, force: true })
        await nextFrame()
        await wait(50)
        trigger(tile0, "pointermove", { x: 35, y: 5, force: true })
        await nextFrame()
        await wait(50)
        trigger(tile0, "pointerup", { x: 35, y: 5, force: true })
        await wait(2000)
        await should(() => {
            // Confirm the state-level swap happened.
            expect(query("#grid").getAttribute("data-tile-state")).toMatch(
                /^1,0,/
            )
        })
        await should(() => {
            const r = query('[data-testid="tile-0"]').getBoundingClientRect()
            // Tile 0 swapped into column 1: 50 (padding) + 60 (column).
            // The bug would leave it at ~170 (col 1 + stranded drag).
            closeTo(r.left, 110, 2)
            closeTo(r.top, 50, 2)
        })
        await should(() => {
            const r = query('[data-testid="tile-1"]').getBoundingClientRect()
            closeTo(r.left, 50, 2)
            closeTo(r.top, 50, 2)
        })
    })
})
