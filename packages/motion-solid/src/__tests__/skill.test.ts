import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const packageRoot = resolve(__dirname, "../..")
const read = (path: string) => readFileSync(resolve(packageRoot, path), "utf8")

describe("agent skill (skills/motion-solid/SKILL.md)", () => {
    const skill = read("skills/motion-solid/SKILL.md")
    const pkg = JSON.parse(read("package.json")) as {
        version: string
        files: string[]
    }

    test("is published", () => {
        expect(pkg.files).toContain("skills")
    })

    test("names the package's version", () => {
        const version = skill.match(/^\s+library_version: "(.+)"$/m)?.[1]
        expect(version).toBe(pkg.version)
    })

    test("only uses exports that exist", async () => {
        const entry = (await import("..")) as Record<string, unknown>
        const imported = [
            ...skill.matchAll(
                /import\s*\{([^}]+)\}\s*from\s*"@motion-s\/solid"/g
            ),
        ].flatMap(([, names]) =>
            names!
                .split(",")
                .map((name) => name.replace(/^\s*type\s+/, "").trim())
                .filter(Boolean)
        )
        expect(imported.length).toBeGreaterThan(0)
        for (const name of imported) expect(entry).toHaveProperty(name)
    })
})
