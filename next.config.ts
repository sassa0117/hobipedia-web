import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/$",
        destination: "/",
        permanent: true,
      },
      {
        source: "/ip/Fate/strange",
        destination: "/ip/Fate%2Fstrange",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
