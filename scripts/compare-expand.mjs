import { chromium } from "playwright"
const browser = await chromium.launch()
for (const [name, port] of [
    ["solid", 5199],
    ["react", 5198],
]) {
    const page = await browser.newPage()
    await page.goto(`http://localhost:${port}/`)
    await page.waitForTimeout(800)
    const out = await page.evaluate(async () => {
        const frame = () => new Promise((r) => requestAnimationFrame(r))
        const expand = document.querySelector(".expand")
        const sections = document.querySelectorAll("section")
        const below = sections[5].querySelector("h2")
        const before = Math.round(below.getBoundingClientRect().top)
        const samples = []
        expand.click()
        for (let i = 0; i < 40; i++) {
            await frame()
            if (i % 4 === 0)
                samples.push(
                    `visual=${Math.round(
                        expand.getBoundingClientRect().height
                    )} layout=${expand.offsetHeight} below=${
                        Math.round(below.getBoundingClientRect().top) - before
                    }`
                )
        }
        return samples
    })
    console.log(name.padEnd(5), out.join(" | "))
}
await browser.close()
