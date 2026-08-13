'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * The hero photograph. It fades and settles from a 1.04 scale once, on load —
 * the only entrance animation on the page. No parallax: the brief asks for
 * restraint and scroll-linked transforms are the first thing to cost frames
 * on a photography-heavy page.
 */
export function HeroImage({ src, alt }: { src: string; alt: string }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="absolute inset-0"
      initial={reduced ? false : { opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0 : 1.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        quality={72}
        sizes="100vw"
        className="object-cover"
      />
    </motion.div>
  );
}
