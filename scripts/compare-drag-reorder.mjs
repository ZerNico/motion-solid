import { chromium } from "playwright"

const browser = await chromium.launch()
for (const [name, port] of [
    ["solid", 5199],
    ["react", 5198],
]) {
    const page = await browser.newPage({
        viewport: { width: 900, height: 2400 },
    })
    const errors = []
    page.on("pageerror", (e) => errors.push(String(e)))
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    await page.goto(`http://localhost:${port}/`)
    await page.waitForTimeout(800)

    // Drag the box far beyond its area: it stays inside (constraints).
    const box = await page.locator(".drag-box").boundingBox()
    const area = await page.locator(".drag-area").boundingBox()
    await page.mouse.move(box.x + 30, box.y + 30)
    await page.mouse.down()
    await page.mouse.move(box.x + 600, box.y + 400, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(1200)
    const after = await page.locator(".drag-box").boundingBox()

    // Drag the first reorder item below the second.
    const reorderItems = page.locator("section:has(h2:text('Reorder')) li")
    const firstItem = await reorderItems.nth(0).boundingBox()
    await page.mouse.move(firstItem.x + 20, firstItem.y + 10)
    await page.mouse.down()
    await page.mouse.move(firstItem.x + 20, firstItem.y + 80, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(800)
    const order = await reorderItems.allTextContents()

    console.log(
        name.padEnd(5),
        `drag box offset in area: (${Math.round(
            after.x - area.x
        )}, ${Math.round(after.y - area.y)}) max (${
            area.width - after.width
        }, ${area.height - after.height})`,
        `| reorder: ${order.join(", ")}`,
        `| errors: ${errors.length ? errors.join("; ") : "none"}`
    )
}
await browser.close()
