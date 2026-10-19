import { createSignal, For, onSettled } from "solid-js"
import { CopyButton } from "./CopyButton"

const packageManagers = [
  { name: "pnpm", command: "add" },
  { name: "npm", command: "install" },
  { name: "yarn", command: "add" },
  { name: "bun", command: "add" },
] as const

type PackageManager = (typeof packageManagers)[number]["name"]

const STORAGE_KEY = "packageManager"

/**
 * The chosen package manager, shared by every `InstallTabs` on the site and saved in
 * localStorage.
 */
const [packageManager, setPackageManager] = createSignal<PackageManager>("pnpm")

const isPackageManager = (value: unknown): value is PackageManager =>
  packageManagers.some((pm) => pm.name === value)

function choose(name: PackageManager) {
  setPackageManager(name)
  localStorage.setItem(STORAGE_KEY, name)
}

/**
 * The install command for `packages`, with a tab for each package manager.
 */
export function InstallTabs(props: { packages: string; class?: string }) {
  const tabs: HTMLButtonElement[] = []
  const command = () => {
    const pm = packageManagers.find((pm) => pm.name === packageManager())!
    return `${pm.name} ${pm.command} ${props.packages}`
  }

  // Read the saved choice after hydration: the server renders the default.
  onSettled(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isPackageManager(saved)) setPackageManager(saved)
  })

  const onKeyDown = (event: KeyboardEvent) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    event.preventDefault()
    const index = packageManagers.findIndex(
      (pm) => pm.name === packageManager()
    )
    const next =
      (index + step + packageManagers.length) % packageManagers.length
    choose(packageManagers[next].name)
    tabs[next].focus()
  }

  return (
    <div
      class={[
        "code not-prose my-6 overflow-hidden rounded-xl border border-border bg-surface text-left",
        props.class,
      ]}
    >
      <div class="flex items-center justify-between border-b border-border pr-2">
        <div
          role="tablist"
          aria-label="Package manager"
          class="flex"
          onKeyDown={onKeyDown}
        >
          <For each={packageManagers}>
            {(pm, index) => (
              <button
                ref={(el) => (tabs[index()] = el)}
                type="button"
                role="tab"
                aria-selected={packageManager() === pm.name ? "true" : "false"}
                tabindex={packageManager() === pm.name ? 0 : -1}
                class={[
                  "-mb-px border-b-2 px-3.5 py-2 font-mono text-xs",
                  packageManager() === pm.name
                    ? "border-accent text-fg"
                    : "border-transparent text-fg-muted hover:text-fg",
                ]}
                onClick={() => choose(pm.name)}
              >
                {pm.name}
              </button>
            )}
          </For>
        </div>
        <CopyButton text={command} />
      </div>
      <pre role="tabpanel" class="p-4 font-mono text-sm">
        {command()}
      </pre>
    </div>
  )
}
