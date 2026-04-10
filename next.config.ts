import type { NextConfig } from "next";
import withBundleAnalyzerPkg from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerPkg({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withBundleAnalyzer(nextConfig);
