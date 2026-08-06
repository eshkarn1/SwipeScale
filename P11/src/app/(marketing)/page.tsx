import { brand } from "@/config/brand";

/**
 * PLACEHOLDER — M0 toolchain gate only.
 *
 * `next build` needs at least one route to compile. This is not the marketing
 * page; it carries no design, no tokens and no copy decisions. The marketing
 * pass owns this file and should replace it wholesale.
 *
 * The product name is read from `@/config/brand` and must stay that way
 * (BUILD_SPEC §1).
 */
export default function Home() {
  return (
    <main>
      <h1>{brand.name}</h1>
      <p>{brand.description}</p>
    </main>
  );
}
