/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  darkMode: "class", // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#a78bfa",
          dark: "#7c3aed",
          light: "#c4b5fd",
          softer: "#ede9fe"
        },
        mint: {
          DEFAULT: "#6ee7b7",
          light: "#a7f3d0",
          dark: "#34d399"
        },
        charcoal: "#111827",
        porcelain: "#f5f5fa",
        dusk: "#1f2937"
      },
      fontFamily: {
        sans: ["'Poppins'", "'Inter'", "'Satoshi'", "ui-sans-serif", "system-ui"],
        heading: ["'Poppins'", "'Inter'", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        soft: "0 2px 18px -6px rgba(15, 23, 42, 0.25)",
        "soft-lg": "0 20px 70px -30px rgba(167, 139, 250, 0.55)",
        glow: "0 0 25px rgba(167, 139, 250, 0.35)",
        "glow-lg": "0 0 45px rgba(110, 231, 183, 0.35)",
        floating: "0 25px 85px -25px rgba(15, 23, 42, 0.45)"
      },
      dropShadow: {
        aurora: "0 30px 60px rgba(167, 139, 250, 0.35)"
      },
      backdropBlur: {
        glass: "24px"
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(circle at 20% 20%, rgba(167, 139, 250, 0.35), transparent 55%), radial-gradient(circle at 80% 0%, rgba(110, 231, 183, 0.25), transparent 45%), linear-gradient(135deg, rgba(15, 23, 42, 0.05), transparent)",
        "chat-surface": "linear-gradient(135deg, rgba(248, 250, 252, 0.92), rgba(255, 255, 255, 0.7))",
        "chat-surface-dark": "linear-gradient(135deg, rgba(17, 24, 39, 0.92), rgba(17, 24, 39, 0.7))"
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-in-out",
        "slide-up": "slideUp 0.45s ease-out",
        "pulse-soft": "pulse 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float-slow": "float 12s ease-in-out infinite"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        float: {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
          "100%": { transform: "translateY(0px)" }
        }
      }
    }
  },
  plugins: []
};
