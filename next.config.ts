import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

  /* /team merges into /about and /contact into /join. Both URLs have been
     posted on Discord and Instagram, so they must not 404. Permanent (308)
     rather than temporary — the routes are not coming back.

     Owned by the orchestrator, not by the page tasks: P1 (/about) and P2
     (/join) would otherwise both need to edit this file. */
  async redirects() {
    return [
      { source: "/team", destination: "/about", permanent: true },
      { source: "/contact", destination: "/join", permanent: true },
    ];
  },
};

export default nextConfig;
