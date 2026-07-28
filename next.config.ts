import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
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
