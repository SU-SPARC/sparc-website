import type { NextConfig } from "next";

/* next/image may fetch from the Supabase Storage public bucket only.
   Derived from NEXT_PUBLIC_SUPABASE_URL (Next loads .env* before this file);
   without it there is no remote pattern and remote images fail loudly. */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

/* Next 16 refuses to optimize images from private/loopback IPs. The local
   stack is on 127.0.0.1, so allow it there and nowhere else. */
const isLocalSupabase =
  supabase !== null && ["127.0.0.1", "localhost"].includes(supabase.hostname);

const nextConfig: NextConfig = {
  devIndicators: false,

  images: {
    remotePatterns: supabase
      ? [
          {
            protocol: supabase.protocol.replace(":", "") as "http" | "https",
            hostname: supabase.hostname,
            port: supabase.port,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
    ...(isLocalSupabase ? { dangerouslyAllowLocalIP: true } : {}),
  },

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
