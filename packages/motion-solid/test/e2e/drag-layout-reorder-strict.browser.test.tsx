/**
 * Port of upstream's `cypress/integration/drag-layout-reorder-strict.ts` and its page,
 * `dev/react/src/tests/drag-layout-reorder-strict.tsx`.
 *
 * Port note: upstream renders the page in React 19 StrictMode, with `FileItem` wrapped in
 * `React.memo` so it doesn't re-render when the parent's state changes. Neither applies to Solid:
 * components run once, so `FileItem` is never re-rendered by its parent's state (what `memo`
 * simulates), and there's no StrictMode double mount. The scenario the spec tests (layout changes
 * above a dragged element that doesn't update itself) stays the same.
 */
import { createSignal, onSettled, Show } from "solid-js"
import { motion, useMotionValue } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * Reproduction for issue #3169:
 * Drag + layout + React 19 StrictMode + memoized components
 *
 * Simulates Ant Design Tree's memoization: FileItem is wrapped in
 * React.memo so it doesn't re-render when parent state changes.
 * When a folder expands during drag, new DOM nodes are inserted,
 * shifting the dragged file's layout. The projection system must
 * compensate even though the file's willUpdate() was never called.
 */

function FolderTitle(props: {
    name: string
    isHovered: boolean
    isExpanded: boolean
}) {
    return (
        <motion.div
            layout
            data-testid={`folder-title-${props.name}`}
            style={{
                padding: "8px 10px",
                background: props.isHovered ? "#555" : "#333",
                color: "white",
            }}
        >
            {props.isExpanded ? "▼" : "▶"} {props.name}
        </motion.div>
    )
}

/**
 * Memoized file item — simulates rc-tree's internal memoization.
 * Prevents re-render when parent state changes, which is critical
 * to reproducing the bug: willUpdate() is never called, so the
 * projection system has no snapshot for this node.
 */
function FileItem(props: { name: string }) {
    const y = useMotionValue(0)
    return (
        <motion.div
            data-testid={`file-${props.name}`}
            drag="y"
            layout
            dragMomentum={false}
            dragSnapToOrigin
            whileTap={{ scale: 1.05 }}
            style={{
                y,
                height: 35,
                background: "#0099ff",
                color: "white",
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                marginBottom: 2,
            }}
        >
            {props.name}
        </motion.div>
    )
}

function PlaceholderFile(props: { name: string }) {
    return (
        <motion.div
            layout
            data-testid={`placeholder-${props.name}`}
            style={{
                height: 35,
                background: "#666",
                color: "white",
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                marginBottom: 2,
            }}
        >
            {props.name}
        </motion.div>
    )
}

declare global {
    interface Window {
        hoverFolder?: (name: string | null) => void
        expandFolder?: (name: string) => void
        collapseFolder?: (name: string) => void
    }
}

function App() {
    const [folderHoveredId, setFolderHoveredId] = createSignal<string | null>(
        null
    )
    const [expandedFolders, setExpandedFolders] = createSignal<Set<string>>(
        new Set(["Folder2"])
    )

    // Expose to the spec (upstream: to Cypress)
    window.hoverFolder = (name: string | null) => {
        setFolderHoveredId(name)
    }
    window.expandFolder = (name: string) => {
        setExpandedFolders((prev) => new Set([...prev, name]))
    }
    window.collapseFolder = (name: string) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev)
            next.delete(name)
            return next
        })
    }
    onSettled(() => () => {
        delete window.hoverFolder
        delete window.expandFolder
        delete window.collapseFolder
    })

    return (
        <div style={{ padding: "50px", width: "300px" }}>
            {/* Folder 1 — starts collapsed, expanding inserts content
                ABOVE the draggable files in Folder 2 */}
            <div style={{ "margin-bottom": "2px" }}>
                <FolderTitle
                    name="Folder1"
                    isHovered={folderHoveredId() === "Folder1"}
                    isExpanded={expandedFolders().has("Folder1")}
                />
                <Show when={expandedFolders().has("Folder1")}>
                    <PlaceholderFile name="Existing1a" />
                    <PlaceholderFile name="Existing1b" />
                    <PlaceholderFile name="Existing1c" />
                </Show>
            </div>

            {/* Folder 2 — starts expanded with draggable files */}
            <div style={{ "margin-bottom": "2px" }}>
                <FolderTitle
                    name="Folder2"
                    isHovered={folderHoveredId() === "Folder2"}
                    isExpanded={expandedFolders().has("Folder2")}
                />
                <Show when={expandedFolders().has("Folder2")}>
                    <FileItem name="File1" />
                    <FileItem name="File2" />
                    <FileItem name="File3" />
                </Show>
            </div>

            {/* Folder 3 — empty target */}
            <div style={{ "margin-bottom": "2px" }}>
                <FolderTitle
                    name="Folder3"
                    isHovered={folderHoveredId() === "Folder3"}
                    isExpanded={expandedFolders().has("Folder3")}
                />
            </div>

            <div
                id="result"
                data-hovered={folderHoveredId() || ""}
                data-expanded={[...expandedFolders()].join(",")}
            />
        </div>
    )
}

const file1 = () => query("[data-testid='file-File1']")

/**
 * Starts dragging File1 downward.
 */
async function startDrag() {
    await visit(App)
    await wait(200)
    // Start dragging File1 downward
    const element = file1()
    await nextFrame()
    await nextFrame()
    trigger(element, "pointerdown", { x: 100, y: 15, force: true })
    await wait(50)
    trigger(element, "pointermove", { x: 100, y: 20, force: true })
    await nextFrame()
    await wait(50)
    // Drag down slightly
    trigger(element, "pointermove", { x: 100, y: 80, force: true })
    await nextFrame()
    await wait(200)
}

/**
 * Test for issue #3169: Drag + layout + React 19 StrictMode
 *
 * Simulates Ant Design Tree behavior:
 * 1. Memoized file components (don't re-render on parent state changes)
 * 2. Layout changes above the dragged element (folder expansion)
 *
 * The projection system must compensate even when the dragged file's
 * willUpdate() was never called because the component didn't re-render.
 */
describe("Drag layout reorder in StrictMode", () => {
    it("Maintains drag position when content is inserted above (memoized component)", async () => {
        await startDrag()
        // Record position before expanding Folder1
        const preExpandTop = file1().getBoundingClientRect().top

        // Expand Folder1 — this inserts 3 items (~105px total)
        // ABOVE the dragged file, shifting it down in the DOM
        window.expandFolder!("Folder1")
        await wait(500)

        // Verify expansion happened
        await should(() => query("[data-testid='placeholder-Existing1a']"))

        // The dragged file MUST stay near its pre-expand position.
        // Without the fix, the file would jump down by ~105px
        // because the memoized component's willUpdate() is never
        // called, so the projection system has no snapshot and
        // skips drag compensation.
        await should(() => {
            const postExpandTop = file1().getBoundingClientRect().top
            expect(
                postExpandTop,
                `File1 jumped from ${preExpandTop} to ${postExpandTop} after folder expand`
            ).toBeGreaterThanOrEqual(preExpandTop - 50)
            expect(
                postExpandTop,
                `File1 jumped from ${preExpandTop} to ${postExpandTop} after folder expand`
            ).toBeLessThanOrEqual(preExpandTop + 50)
        })
        // Release drag
        trigger(file1(), "pointerup", { force: true })
    })

    it("Maintains drag position on simple hover state change", async () => {
        await startDrag()
        const preHoverTop = file1().getBoundingClientRect().top

        // Trigger hover state change (re-renders layout siblings)
        window.hoverFolder!("Folder3")
        await wait(300)

        await should(() =>
            expect(query("#result").getAttribute("data-hovered")).toBe(
                "Folder3"
            )
        )

        await should(() => {
            const postHoverTop = file1().getBoundingClientRect().top
            expect(
                postHoverTop,
                `File1 jumped from ${preHoverTop} to ${postHoverTop} after folder hover`
            ).toBeGreaterThanOrEqual(preHoverTop - 30)
            expect(
                postHoverTop,
                `File1 jumped from ${preHoverTop} to ${postHoverTop} after folder hover`
            ).toBeLessThanOrEqual(preHoverTop + 30)
        })
        trigger(file1(), "pointerup", { force: true })
    })
})
