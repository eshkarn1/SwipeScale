import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { KitchenSink } from "./kitchen-sink";

/**
 * /kitchen-sink — M0's acceptance surface (BUILD_SPEC §7).
 *
 * Dev-only. It is a 404 in a production build rather than being deleted or
 * excluded from the compile, so that CI still typechecks, lints and builds it:
 * a component gallery that stops compiling the week after it is written is
 * worth nothing. `noindex` is belt and braces for any non-production deploy.
 */
export const metadata: Metadata = {
  title: "Kitchen sink",
  robots: { index: false, follow: false },
};

export default function KitchenSinkPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <KitchenSink />;
}
