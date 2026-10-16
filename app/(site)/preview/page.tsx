/* /preview — internal specimen catalogue.
 *
 * Server component: it exists to carry the metadata and mount the client
 * exhibits. Everything visible lives in ./preview-client.
 *
 * Not linked from anywhere and not indexed, but NOT deleted after launch —
 * it is how the next e-board sees what the design system contains.
 */

import type { Metadata } from "next";

import { PreviewClient } from "./preview-client";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false },
};

export default function PreviewPage() {
  return <PreviewClient />;
}
