import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ig: {
          blue: "#0095f6",
          "blue-hover": "#1877f2",
          red: "#ed4956",
          gray: "#8e8e8e",
          "gray-light": "#efefef",
          "gray-border": "#dbdbdb",
          "bg-dark": "#000",
          "bg-secondary": "#fafafa",
        },
      },
      maxWidth: {
        feed: "470px",
      },
    },
  },
  plugins: [],
};
export default config;
