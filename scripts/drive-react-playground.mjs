import { chromium } from "playwright"

const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on("pageerror", (e) => errors.push(String(e)))
page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
await page.goto("http://localhost:5198/")
await page.waitForTimeout(800)

const sample = (fn) =>
    page.evaluate(async (src) => {
        const f = new Function("return " + src)()
        const frame = () => new Promise((r) => requestAnimationFrame(r))
        const out = []
        const read = f()
        for (let i = 0; i < 30; i++) {
            await frame()
            if (i % 3 === 0) out.push(read())
        }
        return out
    }, fn.toString())

// Switch
const switchSamples = await sample(() => {
    document.querySelector(".switch").click()
    const h = document.querySelector(".handle")
    return () => Math.round(h.getBoundingClientRect().left)
})
console.log("switch:", switchSamples.join(" "))

// Tabs
const tabSamples = await sample(() => {
    document.querySelectorAll(".tab")[2].click()
    return () =>
        Math.round(
            document.querySelector(".underline").getBoundingClientRect().left
        )
})
console.log("tabs underline:", tabSamples.join(" "))

// Expand
const expandSamples = await sample(() => {
    const el = document.querySelector(".expand")
    el.click()
    return () => Math.round(el.getBoundingClientRect().height)
})
console.log("expand height:", expandSamples.join(" "))

// List shuffle: track item 1's top
const listSamples = await sample(() => {
    const buttons = [...document.querySelectorAll("button")]
    const tops = () =>
        [...document.querySelectorAll(".list li")]
            .map(
                (l) =>
                    l.textContent.split(" ")[1] +
                    "@" +
                    Math.round(l.getBoundingClientRect().top)
            )
            .join(",")
    const before = tops()
    let order
    do {
        buttons.find((b) => b.textContent === "Shuffle").click()
        order = [...document.querySelectorAll(".list li")].map(
            (l) => l.textContent
        )
    } while (false)
    return () => tops() + " (before " + before + ")"
})
console.log("list shuffle item1 top:", listSamples.join(" "))

// List remove: click item 2, track item 3 top and item 2 presence
const removeSamples = await sample(() => {
    const items = () => [...document.querySelectorAll(".list li")]
    const find = (n) =>
        items().find((l) => l.textContent.startsWith(`Item ${n} `))
    find(2).click()
    return () =>
        `${
            find(2)
                ? "2:" + getComputedStyle(find(2)).opacity.slice(0, 4)
                : "2:gone"
        } 3:${Math.round(find(3).getBoundingClientRect().top)}`
})
console.log("list remove:", removeSamples.join(" | "))

// Presence toggle
const presenceSamples = await sample(() => {
    const section = document.querySelectorAll("section")[0]
    section.querySelector("button").click()
    return () => {
        const c = section.querySelector(".card")
        return c ? getComputedStyle(c).opacity.slice(0, 4) : "gone"
    }
})
console.log("presence exit:", presenceSamples.join(" "))

// mode=wait
const waitSamples = await sample(() => {
    const section = document.querySelectorAll("section")[5]
    section.querySelector("button").click()
    return () =>
        [...section.querySelectorAll(".card")]
            .map(
                (c) =>
                    c.style.backgroundColor.slice(4, 7) +
                    "@" +
                    getComputedStyle(c).opacity.slice(0, 4)
            )
            .join(",")
})
console.log("wait mode:", waitSamples.join(" | "))

console.log("errors:", errors)
await browser.close()
