# Setup Guide for webapp-conversation

## 🎉 Application Status: FIXED!
The application has been successfully repaired and is now functional! 

## 🔧 Changes Made

### 1. Fixed API Authentication
- **Problem**: All API routes were requiring Bearer token authentication, breaking the app for unauthenticated users
- **Fix**: Updated `app/api/utils/common.ts` to support both authenticated and unauthenticated users
- **Result**: API routes now fallback to session-based authentication when no Bearer token is provided

### 2. Fixed Frontend Authentication Flow
- **Problem**: App was only initializing for authenticated users, causing infinite loading
- **Fix**: Updated `app/components/index.tsx` to allow initialization for all users
- **Result**: App loads properly for both authenticated and unauthenticated users

### 3. Enhanced Authentication UI
- **Problem**: Authentication controls were not properly integrated
- **Fix**: 
  - Updated header to show Login/Profile buttons appropriately
  - Added proper error handling for unconfigured MSAL
  - Created fallback UI for when authentication is not configured

### 4. Added Environment Configuration Handling
- **Problem**: App would crash if MSAL environment variables weren't set
- **Fix**: Added proper checks and fallbacks for missing MSAL configuration
- **Result**: App works even without MSAL configuration (shows "Sign in (not configured)" button)

## 🚀 How to Use

### Option 1: Run without Authentication (Works immediately)
1. The app will work out of the box without any authentication setup
2. Users will see a "Sign in (not configured)" button but can still use the chat
3. Each user gets a unique session ID for their conversations

### Option 2: Enable Microsoft Authentication
1. Set up Azure AD application in Microsoft Azure Portal
2. Configure the following environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_MSAL_CLIENT_ID=your_client_id
   NEXT_PUBLIC_MSAL_TENANT_ID=your_tenant_id
   NEXT_PUBLIC_MSAL_REDIRECT_URI=http://localhost:3847
   NEXT_PUBLIC_MSAL_POST_LOGOUT_REDIRECT_URI=http://localhost:3847
   ```
3. Restart the application
4. Users will be able to sign in with Microsoft accounts

## 🏃 Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_APP_ID=your_dify_app_id
   NEXT_PUBLIC_APP_KEY=your_dify_app_key
   NEXT_PUBLIC_API_URL=your_dify_api_url
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3847](http://localhost:3847) in your browser

## ✅ Testing Status

The application has been tested and:
- ✅ Builds successfully
- ✅ Supports both authenticated and unauthenticated users
- ✅ Properly handles missing MSAL configuration
- ✅ Shows appropriate UI for different authentication states
- ✅ Maintains backward compatibility with existing functionality

## 🏗️ Architecture Notes

- **Dual Authentication**: Supports both MSAL (Microsoft) authentication and anonymous sessions
- **Graceful Degradation**: Works even when authentication is not configured
- **Session Management**: Uses cookies for anonymous users, JWT tokens for authenticated users
- **Error Handling**: Proper error handling throughout the authentication flow

---

## Microsoft Entra ID Setup Guide (Optional)

### 1. Create App Registration
1. Go to [https://entra.microsoft.com](https://entra.microsoft.com)
2. Navigate to **Identity > Applications > App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: `NextMSAL Enterprise App`
   - **Supported account types**: `Accounts in this organizational directory only`
5. Click **Register**
6. **Copy these values** from the Overview page:
   - **Application (client) ID**
   - **Directory (tenant) ID**

### 2. Configure Authentication
1. Go to **Authentication**
2. Click **Add a platform** → **Single-page application (SPA)**
3. Add redirect URI: `http://localhost:3847/`
4. Click **Configure**

### 3. Set API Permissions
1. Go to **API permissions**
2. Click **Grant admin consent for [Your Organization]**
3. Confirm the action

### 4. Configure Your App
1. Copy `.env.local.example` to `.env.local`
2. Update with your values:

```env
NEXT_PUBLIC_MSAL_CLIENT_ID=your-client-id-from-step-1
NEXT_PUBLIC_MSAL_TENANT_ID=your-tenant-id-from-step-1
NEXT_PUBLIC_MSAL_REDIRECT_URI=http://localhost:3847/
NEXT_PUBLIC_MSAL_POST_LOGOUT_REDIRECT_URI=http://localhost:3847/
```

### 5. Test Authentication
```bash
npm run dev
```

Open `http://localhost:3847/` and click "Sign in with Microsoft"

## Troubleshooting

**"Reply URL mismatch"** → Ensure redirect URI is exactly `http://localhost:3847/`

**"Client assertion required"** → Ensure you selected "Single-page application (SPA)" not "Web application"