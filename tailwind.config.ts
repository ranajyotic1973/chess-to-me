import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1e40af",
        accent: "#047857",
        backdrop: "#f8fafc"
      },
      fontFamily: {
        body: ["Manrope Variable", "Manrope", "Segoe UI", "Tahoma", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
