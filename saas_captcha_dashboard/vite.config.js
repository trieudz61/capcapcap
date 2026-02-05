import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true, // Allow external access
        strictPort: false,
        allowedHosts: [
            'frequent-taxes-bind-differ.trycloudflare.com',
            '.trycloudflare.com' // Allow all trycloudflare.com subdomains
        ]
    }
})
