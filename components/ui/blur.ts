/* next/image placeholder props for an ImageRef (lib/data/types).
 *
 * `placeholder="blur"` without a `blurDataURL` is a runtime error for remote
 * images, and not every media row has a blur (older uploads, or a failed
 * thumbnail step), so the pair is spread only when the row carries one.
 * Pure and dependency-free, so server and client components can both use it. */

import type { ImageRef } from "@/lib/data/types";

export function blurProps(
  image: Pick<ImageRef, "blur">,
): { placeholder: "blur"; blurDataURL: string } | Record<string, never> {
  return image.blur ? { placeholder: "blur", blurDataURL: image.blur } : {};
}
