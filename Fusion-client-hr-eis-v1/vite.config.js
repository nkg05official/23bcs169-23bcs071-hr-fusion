import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/Modules/HR/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/Modules/HR/services/**/*.js"],
    },
  },
});
