import { Link } from "@tanstack/solid-router"
import { MobileNav } from "./MobileNav"

export function Header() {
  return (
    <header class="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        <Link to="/" class="flex items-center gap-2 font-semibold">
          <Logo />
          motion-solid
        </Link>
        <nav class="ml-auto flex items-center gap-5 text-sm text-fg-muted">
          <Link
            to="/docs/introduction"
            class="hover:text-fg"
            activeProps={{ class: "text-fg" }}
          >
            Docs
          </Link>
          <a
            href="https://github.com/zernico/motion-solid"
            class="hover:text-fg"
          >
            GitHub
          </a>
          <MobileNav />
        </nav>
      </div>
    </header>
  )
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect width="20" height="20" rx="6" class="fill-accent" />
      <path d="M5 14 10 6l5 8" class="fill-none stroke-white stroke-2" />
    </svg>
  )
}
