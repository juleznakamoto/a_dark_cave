import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Toggle-only tokens. Standard steps (green-700, gray-100, …) stay
        // on Tailwind's palette so the rest of the game does not shift.
        "gray-1000": "var(--ds-gray-1000)",
        "gray-alpha-400": "var(--ds-gray-alpha-400)",
        "background-100": "var(--ds-background-100)",
        "background-200": "var(--ds-background-200)",
        success: "var(--geist-success)",
        "accents-1": "var(--accents-1)",
        "accents-2": "var(--accents-2)",
        "blue-1000": "var(--ds-blue-1000)",
        "red-1000": "var(--ds-red-1000)",
        "amber-1000": "var(--ds-amber-1000)",
        "green-1000": "var(--ds-green-1000)",
        "teal-1000": "var(--ds-teal-1000)",
        "purple-1000": "var(--ds-purple-1000)",
        "pink-1000": "var(--ds-pink-1000)",
      },
      boxShadow: {
        toggle: "var(--ds-toggle-ring)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      /**
       * Rem-based aliases for legacy px sizes (16px root). Symbols keep arbitrary px.
       * Default sm/xs/… are size-only strings so Tailwind does not emit a fixed rem
       * line-height that would beat the scaled `:where(.text-*)` rules in index.css.
       * Explicit `leading-*` (higher specificity than `:where`) still wins.
       */
      fontSize: {
        "3xs": "0.5625rem",
        "2xs": "0.625rem",
        xxs: "0.6875rem",
        "xs-plus": "0.8125rem",
        xs: "0.8125rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "shop-info-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "shop-info-pulse":
          "shop-info-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
