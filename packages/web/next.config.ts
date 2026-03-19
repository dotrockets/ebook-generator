import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@ebook-gen/core", "execa", "gray-matter", "@anthropic-ai/sdk"],
};

export default nextConfig;
