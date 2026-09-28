import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Long-lived libraries get their own chunks: smaller entry file, and they
        // stay cached across app deploys. (The editor and canvas are lazy-loaded.)
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            {
              name: "radix",
              test: /node_modules[\\/](@radix-ui|@floating-ui|react-remove-scroll|react-remove-scroll-bar|react-style-singleton|use-callback-ref|use-sidecar|aria-hidden|tslib)[\\/]/,
            },
            { name: "date-picker", test: /node_modules[\\/](react-day-picker|date-fns|@date-fns)[\\/]/ },
          ],
        },
      },
    },
  },
});
