import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'github.com',
      // if you ever use raw avatar URLs, you might also add:
      // 'avatars.githubusercontent.com',
    ],
  },
};

export default nextConfig;
