#!/usr/bin/env node

/* eslint-disable */
/**
 * Local LLM Proxy Server
 *
 * This script creates a proxy server that forwards requests from the browser to local LLM instances
 * (Ollama or LM Studio) while adding necessary CORS headers to avoid browser CORS issues.
 * 
 * Usage:
 *   node local-llm-proxy.js [options]
 * 
 * Options:
 *   --port <number>       Port to run the proxy server on (default: 3500)
 *   --ollama-port <number>  Port for Ollama (default: 11434)
 *   --lmstudio-port <number> Port for LM Studio (default: 1234)
 *   --help                Show this help message
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Default configuration
const config = {
  proxyPort: 3500,
  ollamaPort: 11434,
  lmStudioPort: 1234,
  ollamaBaseUrl: null,
  lmStudioBaseUrl: null,
  debug: false
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port':
        config.proxyPort = parseInt(args[++i], 10);
        break;
      case '--ollama-port':
        config.ollamaPort = parseInt(args[++i], 10);
        break;
      case '--lmstudio-port':
        config.lmStudioPort = parseInt(args[++i], 10);
        break;
      case '--debug':
        config.debug = true;
        break;
      case '--ollama-base-url':
        config.ollamaBaseUrl = args[++i];
        break;
      case '--lmstudio-base-url':
        config.lmStudioBaseUrl = args[++i];
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }
}

// Show help message
function showHelp() {
  console.log(`
Local LLM Proxy Server

This proxy forwards requests from the browser to local LLM instances (Ollama or LM Studio)
while adding necessary CORS headers to avoid browser CORS issues.

Usage:
  node local-llm-proxy.cjs [options]

Options:
  --port <number>           Port to run the proxy server on (default: 3500)
  --ollama-port <number>    Port for Ollama (default: 11434)
  --lmstudio-port <number>  Port for LM Studio (default: 1234)
  --ollama-base-url <url>   Custom base URL for Ollama (overrides port)
  --lmstudio-base-url <url> Custom base URL for LM Studio (overrides port)
  --debug                   Enable debug logging
  --help                    Show this help message
  `);
}

// Log messages if debug is enabled
function debugLog(...args) {
  if (config.debug) {
    console.log('[DEBUG]', ...args);
  }
}

// Create the proxy server
function createProxyServer() {
  // Create the server
  const server = http.createServer((req, res) => {
    // Parse the request URL
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    
    // Collect request body data
    let body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    });
    
    req.on('end', () => {
      body = Buffer.concat(body).toString();
      
      // Determine target based on path or headers
      let targetPort;
      let targetHost = 'localhost';
      let targetPath = path;
      let targetUrl = null;
      
      console.log(`[PROXY] Received request for path: ${path}`);
      console.log(`[PROXY] Request method: ${req.method}`);
      console.log(`[PROXY] Request headers:`, req.headers);
      
      // Check for custom base URL in query parameters
      const customBaseUrl = parsedUrl.query.baseUrl;
      
      // Route based on path
      if (path.startsWith('/ollama/')) {
        // Check for custom base URL in query or config
        if (customBaseUrl) {
          targetUrl = customBaseUrl;
          targetPath = path.replace('/ollama', '');
          console.log(`[PROXY] Routing to custom Ollama URL: ${targetUrl}${targetPath}`);
        } else if (config.ollamaBaseUrl) {
          targetUrl = config.ollamaBaseUrl;
          targetPath = path.replace('/ollama', '');
          console.log(`[PROXY] Routing to configured Ollama URL: ${targetUrl}${targetPath}`);
        } else {
          targetPort = config.ollamaPort;
          targetPath = path.replace('/ollama', '');
          console.log(`[PROXY] Routing to Ollama: ${targetPath}`);
        }
      } else if (path.startsWith('/lmstudio/')) {
        // Check for custom base URL in query or config
        if (customBaseUrl) {
          targetUrl = customBaseUrl;
          targetPath = path.replace('/lmstudio', '');
          console.log(`[PROXY] Routing to custom LM Studio URL: ${targetUrl}${targetPath}`);
        } else if (config.lmStudioBaseUrl) {
          targetUrl = config.lmStudioBaseUrl;
          targetPath = path.replace('/lmstudio', '');
          console.log(`[PROXY] Routing to configured LM Studio URL: ${targetUrl}${targetPath}`);
        } else {
          targetPort = config.lmStudioPort;
          targetPath = path.replace('/lmstudio', '');
          console.log(`[PROXY] Routing to LM Studio: ${targetPath}`);
        }
      } else if (path.startsWith('/v1/')) {
        // OpenAI-compatible API path, assume LM Studio
        targetPort = config.lmStudioPort;
        console.log(`[PROXY] Routing OpenAI-compatible path to LM Studio: ${targetPath}`);
      } else if (path.includes('api/chat') || path.includes('api/tags')) {
        // Ollama-specific paths
        targetPort = config.ollamaPort;
        console.log(`[PROXY] Routing Ollama-specific path: ${targetPath}`);
      } else {
        // Default to Ollama if no specific routing is matched
        targetPort = config.ollamaPort;
        console.log(`[PROXY] Default routing to Ollama: ${targetPath}`);
      }
      
      // Prepare headers for the proxied request
      const headers = { ...req.headers };
      
      // Remove headers that might cause issues
      delete headers.host;
      delete headers.origin;
      delete headers.referer;
      delete headers['sec-fetch-mode'];
      delete headers['sec-fetch-site'];
      delete headers['sec-fetch-dest'];
      
      // Add content-type header if not present
      if (!headers['content-type'] && (req.method === 'POST' || req.method === 'PUT')) {
        headers['content-type'] = 'application/json';
      }
      
      console.log(`[PROXY] Forwarding request with modified headers:`, headers);
      
      // Create options for the proxied request
      let options;
      
      if (targetUrl) {
        // Parse the custom URL
        const parsedTargetUrl = new URL(targetUrl);
        
        options = {
          protocol: parsedTargetUrl.protocol,
          hostname: parsedTargetUrl.hostname,
          port: parsedTargetUrl.port || (parsedTargetUrl.protocol === 'https:' ? 443 : 80),
          path: targetPath,
          method: req.method,
          headers: headers
        };
        
        debugLog(`Proxying request to ${targetUrl}${targetPath}`);
      } else {
        options = {
          hostname: targetHost,
          port: targetPort,
          path: targetPath,
          method: req.method,
          headers: headers
        };
        
        debugLog(`Proxying request to ${targetHost}:${targetPort}${targetPath}`);
      }
      
      // Create the proxied request
      const proxyReq = (options.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
        console.log(`[PROXY] Received response from target with status: ${proxyRes.statusCode}`);
        console.log(`[PROXY] Target response headers:`, proxyRes.headers);
        
        // Add CORS headers to the response
        const responseHeaders = {
          ...proxyRes.headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Origin',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        };
        
        console.log(`[PROXY] Sending response with headers:`, responseHeaders);
        
        res.writeHead(proxyRes.statusCode, responseHeaders);
        
        // Pipe the proxied response to the original response
        proxyRes.pipe(res);
      });
      
      // Handle errors in the proxied request
      proxyReq.on('error', (error) => {
        console.error(`Error proxying request: ${error.message}`);
        
        // Send an error response
        res.writeHead(502, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true'
        });
        
        res.end(JSON.stringify({
          error: {
            message: `Failed to connect to ${targetHost}:${targetPort}. Make sure the LLM service is running.`,
            details: error.message
          }
        }));
      });
      
      // Handle OPTIONS requests for CORS preflight
      if (req.method === 'OPTIONS') {
        console.log(`[PROXY] Handling OPTIONS preflight request for path: ${path}`);
        
        const preflightHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Origin',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        };
        
        console.log(`[PROXY] Sending preflight response with headers:`, preflightHeaders);
        
        res.writeHead(200, preflightHeaders);
        res.end();
        return;
      }
      
      // Write the body to the proxied request and end it
      if (body) {
        proxyReq.write(body);
      }
      proxyReq.end();
    });
  });
  
  // Disable timeouts to prevent the server from closing connections
  server.timeout = 0; // Disable socket timeout
  server.keepAliveTimeout = 0; // Disable keep-alive timeout
  server.headersTimeout = 0; // Disable headers timeout
  
  // Set maximum number of listeners to prevent memory leaks
  server.setMaxListeners(0);
  
  console.log('[PROXY] Server configured to stay active until manually shut down');
  
  return server;
}

// Main function
function main() {
  parseArgs();
  
  const server = createProxyServer();
  
  server.listen(config.proxyPort, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                  Local LLM Proxy Server                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Proxy server running on http://localhost:${config.proxyPort}                ║
║                                                                ║
║  Routes:                                                       ║
║    - Ollama:    http://localhost:${config.proxyPort}/ollama/*                ║
║    - LM Studio: http://localhost:${config.proxyPort}/lmstudio/*              ║
║                                                                ║
║  Custom Base URLs:                                             ║
║    - Ollama:    ${config.ollamaBaseUrl || 'Not set (using default port)'}
║    - LM Studio: ${config.lmStudioBaseUrl || 'Not set (using default port)'}
║                                                                ║
║  The proxy will automatically add CORS headers to all responses.║
║                                                                ║
║  Server will stay active until manually shut down.             ║
║  Press Ctrl+C to stop the server.                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);
  });
  
  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Error: Port ${config.proxyPort} is already in use.`);
      console.error('Please choose a different port with --port <number>');
    } else {
      console.error(`Server error: ${error.message}`);
    }
    process.exit(1);
  });
}

// Run the main function
main();