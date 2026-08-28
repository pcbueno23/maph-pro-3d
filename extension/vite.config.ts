import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    // Porta fixa: o manifest do CRXJS em modo dev aponta pro HMR nessa porta.
    port: 5175,
    strictPort: true,
  },
});
