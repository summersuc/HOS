/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'selector', // Changed from 'class' to 'selector' for v4 compatibility
    theme: {
        extend: {
            boxShadow: {
                // Customized diffuse shadows for suki
                'card': '0 4px 12px -2px rgba(0,0,0,0.08)',
                'float': '0 12px 24px -4px rgba(0,0,0,0.12)',
                'icon': '0 2px 8px rgba(0,0,0,0.12)',
            },
            colors: {
                'suki-text': '#747678', // Dilute Black / Deep Gray Blue
                'suki-border': '#B9C9C9', // Sage Green
                'suki-ice': '#D5ECF2', // Ice Blue
                'suki-cream': '#FCF2E6', // Cream Pink
            },
            animation: {
                'spin-slow': 'spin 8s linear infinite',
            }
        },
    },
    plugins: [],
}
