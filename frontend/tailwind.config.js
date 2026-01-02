/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Australian natural tones
        'eucalyptus': '#7FB069',      // Eucalyptus green
        'sandstone': '#D4A574',       // Warm sandstone beige
        'ocean': '#5B8FA3',           // Muted ocean blue
        'sunshine': '#F4D03F',        // Sunshine yellow
        'warm-red': '#C97D60',        // Muted warm red (for NO state)
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}






