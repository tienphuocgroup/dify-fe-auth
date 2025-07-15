# Conversation Web App Template
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Config App
Create a file named `.env.local` in the current directory and copy the contents from `.env.example`. Configure the following environment variables:

### Required Configuration

#### Dify Backend Configuration
```
# APP ID: This is the unique identifier for your app. You can find it in the app's detail page URL. 
# For example, in the URL `https://cloud.dify.ai/app/xxx/workflow`, the value `xxx` is your APP ID.
NEXT_PUBLIC_APP_ID=your-dify-app-id

# APP API Key: This is the key used to authenticate your app's API requests. 
# You can generate it on the app's "API Access" page by clicking the "API Key" button in the top-right corner.
NEXT_PUBLIC_APP_KEY=your-dify-app-key

# APP URL: This is the API's base URL. If you're using the Dify cloud service, set it to: https://api.dify.ai/v1.
NEXT_PUBLIC_API_URL=https://api.dify.ai/v1
```

#### Microsoft Azure AD Configuration (Optional)
```
# Azure Application (client) ID from your Azure AD app registration
NEXT_PUBLIC_MSAL_CLIENT_ID=your-azure-app-client-id

# Azure Directory (tenant) ID from your Azure AD
NEXT_PUBLIC_MSAL_TENANT_ID=your-azure-tenant-id

# Redirect URI for authentication callback (must match Azure AD configuration)
NEXT_PUBLIC_MSAL_REDIRECT_URI=http://localhost:3847

# Post-logout redirect URI
NEXT_PUBLIC_MSAL_POST_LOGOUT_REDIRECT_URI=http://localhost:3847
```

### Optional Configuration

#### Security Configuration
```
# CSP Report URI - Optional endpoint for CSP violation reports
CSP_REPORT_URI=https://your-csp-report-endpoint.com/report

# HSTS Max Age - Optional, defaults to 31536000 (1 year)
HSTS_MAX_AGE=31536000

# Security Headers Debug Mode - Set to true for development
SECURITY_DEBUG=false

# Content Security Policy Configuration
CSP_REPORT_ONLY=false

# CORS Configuration
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Rate Limiting Configuration
```
# General API rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Specific endpoint rate limits
RATE_LIMIT_API_REQUESTS=100
RATE_LIMIT_API_WINDOW=60
RATE_LIMIT_AUTH_REQUESTS=20
RATE_LIMIT_AUTH_WINDOW=60
RATE_LIMIT_UPLOAD_REQUESTS=10
RATE_LIMIT_UPLOAD_WINDOW=60
RATE_LIMIT_CHAT_REQUESTS=50
RATE_LIMIT_CHAT_WINDOW=60
RATE_LIMIT_SENSITIVE_REQUESTS=5
RATE_LIMIT_SENSITIVE_WINDOW=60
```

#### Session Security (Production)
```
# Session secret for signing cookies
SESSION_SECRET=your-session-secret-key

# Encryption key for token encryption
ENCRYPTION_KEY=your-encryption-key-for-tokens
```

#### Redis Configuration (Production)
```
# Redis connection settings for production deployments
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
```

#### Development Settings
```
# Environment mode
NODE_ENV=development

# Enable development features
NEXT_PUBLIC_DEV_MODE=true
```

Config more in `config/index.ts` file:   
```js
export const APP_INFO: AppInfo = {
  title: 'Chat APP',
  description: '',
  copyright: '',
  privacy_policy: '',
  default_language: 'zh-Hans'
}

export const isShowPrompt = true
export const promptTemplate = ''
```

## Getting Started
First, install dependencies:
```bash
npm install
# or
yarn
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```
Open [http://localhost:3847](http://localhost:3847) with your browser to see the result.

## Using Docker

```
docker build . -t <DOCKER_HUB_REPO>/webapp-conversation:latest
# now you can access it in port 3000
docker run -p 3000:3000 <DOCKER_HUB_REPO>/webapp-conversation:latest
```

Open [http://localhost:3847](http://localhost:3847) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

> ⚠️ If you are using [Vercel Hobby](https://vercel.com/pricing), your message will be truncated due to the limitation of vercel.


The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
