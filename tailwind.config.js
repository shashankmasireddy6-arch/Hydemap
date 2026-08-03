/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // lib/markerChips.ts builds map marker DOM nodes with Tailwind
    // classes in plain template strings (same technique MapView.tsx's
    // buildPopupHtml already used, just in its own file this time) — the
    // content scanner needs to see them here or it strips the classes
    // from the production build.
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        post: {
          rent: "#22c55e", // green
          sale: "#3b82f6", // blue
          sharing: "#eab308", // yellow
          requirement: "#ef4444", // red
          rentpaid: "#a855f7", // purple
        },
      },
      boxShadow: {
        panel: "0 4px 20px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};
