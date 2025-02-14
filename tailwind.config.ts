import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F172A",
        primary: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
        },
        secondary: {
          DEFAULT: "#64748B",
          hover: "#475569",
        },
        success: "#22C55E",
        error: "#EF4444",
        card: "#1E293B",
      },
    },
  },
  plugins: [],
} satisfies Config;
