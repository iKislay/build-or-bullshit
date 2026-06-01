import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok tunnel origins so the dev server works on external devices
  allowedDevOrigins: [
    '*.ngrok-free.app',
    '*.ngrok.io',
  ],
};

export default nextConfig;
