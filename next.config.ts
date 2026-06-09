import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite que el celular acceda al dev server vía el túnel de VSCode.
  // Sin esto, Next 16 bloquea los assets /_next/* de origen cruzado → pantalla en blanco.
  // '**' = wildcard recursivo (varios niveles); el host es m0z2gw4x-3000.brs.devtunnels.ms
  allowedDevOrigins: ['**.devtunnels.ms', '**.app.github.dev'],
};

export default nextConfig;
