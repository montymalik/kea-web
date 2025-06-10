// proxy.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PROXY_PORT = 3001; // This is the port your proxy will listen on
const KEA_API_TARGET = 'http://192.168.1.97:8000'; // Your actual Kea API endpoint

// Configure the proxy middleware
app.use('/api', createProxyMiddleware({
    target: KEA_API_TARGET,
    changeOrigin: true, // Changes the origin of the host header to the target URL
    pathRewrite: {
        '^/api': '/', // Rewrite the path: '/api/command' becomes '/command' on the Kea side
    },
    onProxyReq: (proxyReq, req, res) => {
        // Optional: Log the outgoing request if needed for debugging
        // console.log(`Proxying: ${req.method} ${req.originalUrl} -> ${proxyReq.path}`);
    },
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy error');
    },
    // Important for CORS: Set Access-Control-Allow-Origin header on proxy's response
    // This allows your frontend to receive the response from the proxy
    onProxyRes: (proxyRes, req, res) => {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*'); // Allow current origin or all
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Include any headers your frontend sends
        res.setHeader('Access-Control-Allow-Credentials', 'true'); // If you handle cookies/credentials
    }
}));

// Handle OPTIONS preflight requests (browsers send these before complex cross-origin requests)
app.options('/api/*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});


app.listen(PROXY_PORT, () => {
    console.log(`Kea API Proxy running on http://localhost:${PROXY_PORT}`);
    console.log(`Proxying requests from http://localhost:${PROXY_PORT}/api to ${KEA_API_TARGET}`);
});
