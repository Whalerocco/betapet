import type { NextConfig } from "next";

/**
 * Playtest mode: tells browsers never to reuse a stored copy of the HTML document.
 *
 * A prerendered page is served with `Cache-Control: s-maxage=31536000` and nothing addressed to a
 * *private* cache, so a phone is free to keep serving the stored document without asking the
 * server. That document names the hashed JS chunks, so a stale copy pins the browser to an old
 * bundle no matter how many times the page is reloaded — during the Version 1 mobile test this
 * cost a round trip diagnosing a bug that had already been fixed and deployed.
 *
 * Off by default: `s-maxage` is the right production answer behind a CDN, and this exists purely
 * so a device on the LAN always gets what was last built. The hashed assets under `/_next/static`
 * keep their immutable caching, which Next does not allow overriding and which is safe anyway —
 * their filenames change whenever their contents do.
 */
const noStoreDuringPlaytest = process.env.BETAPET_NO_STORE === "1";

const nextConfig: NextConfig = {
  async headers() {
    if (!noStoreDuringPlaytest) return [];
    return [
      {
        // Everything except the hashed bundles, which cannot go stale — their filenames change
        // with their contents — and which would otherwise be re-downloaded on every page load.
        source: "/((?!_next/static/).*)",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
