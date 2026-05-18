import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const certDir = path.resolve(__dirname, "cert");
const certFile = path.join(certDir, "cert.pem");
const keyFile = path.join(certDir, "key.pem");
const hasHttpsCert = fs.existsSync(certFile) && fs.existsSync(keyFile);

export default defineConfig({
  plugins: [react()],
  server: hasHttpsCert
    ? {
        https: {
          cert: fs.readFileSync(certFile),
          key: fs.readFileSync(keyFile),
        },
      }
    : undefined,
  build: {
    rollupOptions: {
      input: {
        trustWallet: path.resolve(__dirname, "trust-wallet.html"),
      },
    },
  },
});
