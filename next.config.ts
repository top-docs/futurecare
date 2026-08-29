import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.top-docs.in",
        pathname: "/Dr%20Kirti%20Sinha.webp",
      },
    ],
  },
};

export default nextConfig;
