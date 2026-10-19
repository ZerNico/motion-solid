import { createFileRoute, Link } from "@tanstack/solid-router"
import { For } from "solid-js"
import { Header } from "../components/Header"
import { InstallTabs } from "../components/InstallTabs"
import { Hero } from "../demos/Hero"

const features = [
  {
    title: "Animations",
    description:
      "Animate on mount and on change with keyframes, springs and variants.",
    to: "/docs/animation",
  },
  {
    title: "Gestures",
    description:
      "Hover, tap, focus, pan and drag, with animations while they're active.",
    to: "/docs/gestures",
  },
  {
    title: "Exit animations",
    description:
      "AnimatePresence with presence-aware Show and For keeps removed elements until they've animated out.",
    to: "/docs/animate-presence",
  },
  {
    title: "Layout animations",
    description:
      "Animate size and position changes, and shared elements between components.",
    to: "/docs/layout-animations",
  },
  {
    title: "Scroll",
    description:
      "Trigger animations in view, or link them to the scroll position.",
    to: "/docs/scroll-animations",
  },
  {
    title: "Motion values",
    description:
      "Values that update the DOM every frame, with bridges to Solid's signals.",
    to: "/docs/motion-values",
  },
] as const

export const Route = createFileRoute("/")({
  component: () => (
    <>
      <Header />
      <main class="mx-auto max-w-7xl px-6">
        <section class="flex flex-col items-center gap-8 py-24 text-center">
          <Hero />
          <h1 class="text-5xl font-semibold tracking-tight">motion-solid</h1>
          <p class="max-w-xl text-lg text-fg-muted">
            A port of Motion for React to Solid 2: gestures, exit and layout
            animations, scroll and motion values, on the same engine as Motion.
          </p>
          <div class="flex gap-3">
            <Link
              to="/docs/introduction"
              class="rounded-full bg-accent px-5 py-2.5 font-medium text-white hover:bg-accent/90"
            >
              Get started
            </Link>
            <a
              href="https://github.com/zernico/motion-solid"
              class="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface"
            >
              GitHub
            </a>
          </div>
          <InstallTabs packages="@motion-s/solid" class="w-full max-w-md" />
        </section>
        <section class="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          <For each={features}>
            {(feature) => (
              <Link
                to={feature.to}
                class="rounded-xl border border-border p-5 hover:bg-surface"
              >
                <h2 class="font-semibold">{feature.title}</h2>
                <p class="mt-1 text-sm text-fg-muted">{feature.description}</p>
              </Link>
            )}
          </For>
        </section>
      </main>
    </>
  ),
})
