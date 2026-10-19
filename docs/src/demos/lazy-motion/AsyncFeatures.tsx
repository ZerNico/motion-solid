import { LazyMotion, m } from "@motion-s/solid"

// Loaded in its own chunk, after the page has rendered.
const loadFeatures = () => import("./features").then((res) => res.default)

export default function AsyncFeatures() {
  return (
    <LazyMotion features={loadFeatures} strict>
      <m.button
        type="button"
        class="rounded-full bg-accent px-6 py-3 font-medium text-white"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Loaded lazily
      </m.button>
    </LazyMotion>
  )
}
