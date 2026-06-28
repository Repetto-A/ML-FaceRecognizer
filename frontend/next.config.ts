import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Permite recibir uploads de fotos (multipart) sin tope agresivo del body parser
  // en los Route Handlers que actúan de proxy hacia la API.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
