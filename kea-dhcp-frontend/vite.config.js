// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 80, // Ensure this is 80 if frontend container maps 80 to host 5173
    proxy: {
      // This rule should capture both /api and /api/*
      '/api': {
        target: 'http://backend:3001', // Correct Docker internal service name and port
        changeOrigin: true,
        secure: false,
        // Add rewrite if your backend expects / (root) when it receives /api from frontend
        // For example, if http://backend:3001/ is the Kea endpoint, but frontend sends /api
        // then rewrite is needed. Your proxy-server.js *already* proxies /api to KEA_SERVER + '/'
        // so this rewrite might not be needed or might need adjustment.
        // For now, let's assume '/api' -> 'http://backend:3001/api' is what your proxy-server.js expects
        // and your proxy-server.js will then proxy that to KEA_SERVER + '/'
        // You might consider if the Kea API is actually at http://backend:3001/api or http://backend:3001
        // Given your backend proxy.js, it routes /api/* to KEA_SERVER + '/' and handles /api specifically.

        // Given proxy-server.js
        // app.all('/api/*', async (req, res, next) => { keaUrl = KEA_SERVER + '/' })
        // app.all('/api', async (req, res) => { keaUrl = KEA_SERVER + '/' })
        // This means your backend expects requests to Kea to hit its *root* /api endpoint.
        // So a request to http://backend:3001/api is what it wants.

        // The current Vite proxy configuration `target: 'http://backend:3001'` and key `'/api'`
        // means a frontend request to `/api` becomes `http://backend:3001/api`
        // and a frontend request to `/api/static-ips` becomes `http://backend:3001/api/static-ips`
        // This seems correct for how your backend routes are defined.

        configure: (proxy, _req, _res) => { // Use _req, _res to avoid unused var warnings
          proxy.on('error', (err, req, res) => { // Use req, res for more context
            console.error(`[Vite Proxy] Error for ${req.url}:`, err);
            // Consider sending a specific error response if this happens in dev
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy error', details: err.message }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Vite Proxy] Sending Request: ${req.method} ${req.url} -> ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[Vite Proxy] Received Response: ${proxyRes.statusCode} for ${req.url}`);
          });
        },
      }
    }
  }
})
