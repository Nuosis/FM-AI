# Clarity Micro Service Mesh Frontend

## Vercel Deployment

### Prerequisites

1. A Vercel account
2. The Vercel CLI installed (optional, for local testing)
   ```bash
   npm i -g vercel
   ```

### Environment Variables

The following environment variables must be configured in your Vercel project settings:

- `VITE_API_BASE_URL`: The URL of your backend API (e.g., https://api.yourbackend.com)
- `VITE_FRONTEND_BASE_URL`: The URL where your frontend will be deployed (will be provided by Vercel)
- `VITE_PUBLIC_KEY`: Your application's public key
- `VITE_API_JWT`: Your API JWT token
- `VITE_API_KEY`: Your API key

### Deployment Steps

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. In Vercel:
   - Create a new project
   - Import your repository
   - Configure the environment variables listed above
   - Deploy

3. The following settings will be automatically configured by vercel.json:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
   - Framework Preset: Vite

### Development

For local development:

1. Create a `.env` file with the required environment variables
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   ./start_fe.sh
   ```

### Notes

- The frontend will attempt to connect to the backend API but will continue running even if the backend is not available
- API requests are proxied through Vercel's routing configuration
- All routes will fallback to index.html for client-side routing
