# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start Next.js development server
- `npm run build` - Build the production application
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run fix` - Run ESLint with automatic fixes
- `npm run eslint-fix` - Run ESLint with fixes (alternative command)

## Project Architecture

This is a Next.js 14 conversational web application that integrates with the Dify API platform. The app is built with TypeScript, React, and Tailwind CSS.

### Key Architecture Components

- **Next.js App Router**: Uses the new app directory structure with layout.tsx and page.tsx
- **MSAL Authentication**: Microsoft Authentication Library for Azure AD integration with full OAuth2/OpenID Connect support
- **Dify API Integration**: Connects to Dify platform for conversational AI capabilities via `dify-client` package
- **Streaming Chat**: Implements server-sent events (SSE) for real-time conversation streaming
- **i18n Support**: Multi-language support with i18next for English, Spanish, Japanese, Vietnamese, and Chinese
- **State Management**: Uses Zustand for client-side state management and custom React Context for authentication
- **File Upload**: Supports file attachment and image upload functionality

### Core Directory Structure

- `app/` - Next.js app router pages and API routes
  - `api/` - API routes for chat, conversations, file upload, and messages
  - `components/` - React components organized by feature
    - `auth/` - Authentication UI components (login, profile, guards)
- `config/` - Application configuration including Dify API settings
- `service/` - API service layer with base HTTP client and chat functions
- `types/` - TypeScript type definitions
- `i18n/` - Internationalization configuration and language files
- `hooks/` - Custom React hooks including authentication hooks
- `utils/` - Utility functions
- `lib/` - Authentication configuration and MSAL setup
- `providers/` - React providers for authentication
- `contexts/` - React contexts for state management
- `middleware.ts` - Next.js middleware for route protection

### Environment Setup

Create `.env.local` from `.env.example` with:
- `NEXT_PUBLIC_APP_ID` - Dify app identifier
- `NEXT_PUBLIC_APP_KEY` - Dify API key
- `NEXT_PUBLIC_API_URL` - Dify API base URL (typically https://api.dify.ai/v1)
- `NEXT_PUBLIC_MSAL_CLIENT_ID` - Microsoft Azure Application (client) ID
- `NEXT_PUBLIC_MSAL_TENANT_ID` - Microsoft Azure Directory (tenant) ID
- `NEXT_PUBLIC_MSAL_REDIRECT_URI` - Redirect URI for authentication (default: http://localhost:3847)
- `NEXT_PUBLIC_MSAL_POST_LOGOUT_REDIRECT_URI` - Post-logout redirect URI

### State Management Patterns

- Uses `use-context-selector` for optimized context consumption
- Zustand stores for global state management
- SWR for data fetching and caching
- Custom hooks for conversation and UI state

### API Integration

The service layer in `service/index.ts` handles:
- Streaming chat messages via SSE
- Conversation management
- File upload operations
- Message feedback and rating

### UI Components

- Base components in `app/components/base/` for reusable UI elements
- Chat-specific components in `app/components/chat/`
- Monaco Editor integration for code editing
- Custom file uploader with drag-and-drop support
- Markdown rendering with syntax highlighting

### Authentication System

- **MSAL Integration**: Pure @azure/msal-react implementation with full control
- **Dual Authentication**: Supports both authenticated (Azure AD) and anonymous users
- **Token Management**: Automatic token refresh and secure storage
- **User Context**: Global authentication state management
- **API Authentication**: Bearer token injection for authenticated API requests
- **Backward Compatibility**: Maintains existing cookie-based sessions for anonymous users

### Styling

- Tailwind CSS with custom configuration
- SCSS modules for component-specific styles
- Custom CSS for Monaco Editor and loading animations