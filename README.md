# FM + AI Frontend

A comprehensive React-based frontend application for managing microservices, featuring LLM chat integration, function management, and license control.

## Features

### Authentication System
- Secure user authentication and registration
- Token-based authentication with automatic refresh
- Role-based access control
- Health check monitoring

### LLM Chat Integration
- Interactive chat interface for LLM interactions
- Real-time message processing
- Support for various LLM providers

### Function Management
- Create and manage API functions
- Function testing through chat interface
- CURL command generation
- Progress tracking for function execution

### License Management
- License key generation and validation
- Module selection and management
- API key management
- Organization-level licensing

### Additional Features
- Real-time log viewing
- Module configuration
- Settings management
- Responsive sidebar navigation

## Technical Stack

- **Frontend Framework**: React 18
- **State Management**: Redux Toolkit
- **UI Components**: Material-UI (MUI)
- **Routing**: React Router
- **Build Tool**: Vite
- **Testing**: Vitest
- **HTTP Client**: Axios
- **Authentication**: JWT

## Vercel Deployment

### Prerequisites

1. A Vercel account
2. The Vercel CLI installed (optional, for local testing)
   ```bash
   npm i -g vercel
   ```

### Environment Variables

The following environment variables must be configured in your Vercel project settings:

- `VITE_API_BASE_URL`: The URL of your backend API (e.g., https://clarity-backend-2w6n.onrender.com)
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

## Development

### Setup

1. Clone the repository
2. Create a `.env` file with the required environment variables
3. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

Start the development server:
```bash
./start_fe.sh
```
or
```bash
npm run dev
```

### Testing

Run all tests:
```bash
npm test
```

Run specific test suites:
- Authentication: `npm run test:user-auth`
- LLM Chat: `npm run test:llm`
- License Management: `npm run test:license`
- Module Selection: `npm run test:module-selected`

### Additional Scripts

- Generate JWT: `npm run generate-jwt`
- Initialize Frontend Auth: `npm run frontend-auth-init`
- Lint Code: `npm run lint`

## Notes

- The frontend will attempt to connect to the backend API but will continue running even if the backend is not available
- API requests are proxied through Vercel's routing configuration
- All routes will fallback to index.html for client-side routing
- Comprehensive test coverage for all major features
- Modular architecture for easy extension and maintenance
