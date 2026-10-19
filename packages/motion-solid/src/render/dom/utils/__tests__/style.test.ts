import { normalizeStyleKeys, parseStyleString } from "../style"

describe("parseStyleString", () => {
    test("parses declarations", () => {
        expect(parseStyleString("color: red; opacity:0.5;")).toEqual({
            color: "red",
            opacity: "0.5",
        })
    })

    test("keeps semicolons inside parentheses and quotes", () => {
        expect(
            parseStyleString(
                `background-image: url("a;b.png"); content: 'x;y'; --list: fn(a;b)`
            )
        ).toEqual({
            "background-image": `url("a;b.png")`,
            content: "'x;y'",
            "--list": "fn(a;b)",
        })
    })

    test("lowercases property names, but not CSS variables", () => {
        expect(parseStyleString("Color: red; --Brand: blue")).toEqual({
            color: "red",
            "--Brand": "blue",
        })
    })

    test("skips empty and invalid declarations", () => {
        expect(
            parseStyleString(" ; color ; : red; width: ;height: 1px")
        ).toEqual({ height: "1px" })
    })
})

describe("normalizeStyleKeys", () => {
    test("parses a string and converts its names to camelCase", () => {
        expect(normalizeStyleKeys("background-color: red; --x: 1")).toEqual({
            backgroundColor: "red",
            "--x": "1",
        })
    })
})
