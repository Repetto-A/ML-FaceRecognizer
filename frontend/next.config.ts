import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Evita que Next tome C:\Users\conta (pnpm-lock.yaml) como root y ignore .env.local
  outputFileTracingRoot: path.join(__dirname),
  // Standalone para deploy en Docker (ver frontend/Dockerfile)
  output: "standalone",
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
