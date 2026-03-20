import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@ebook-gen/core", "execa", "gray-matter", "@anthropic-ai/sdk", "replicate"],
};

export default nextConfig;
