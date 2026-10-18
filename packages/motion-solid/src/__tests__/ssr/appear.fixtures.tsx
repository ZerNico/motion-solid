import { motion } from "../.."

export function Appear() {
    return (
        <motion.div
            id="box"
            data-framer-appear-id="appear-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: "linear" }}
        />
    )
}
