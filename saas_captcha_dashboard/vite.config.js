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
            'recap1s.com',
            'www.recap1s.com',
            '.trycloudflare.com'
        ]
    }
})
