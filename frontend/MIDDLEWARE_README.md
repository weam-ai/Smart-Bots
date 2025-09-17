# Solution Access Control Middleware

This middleware implements access control for solution apps by checking user permissions against a centralized API.

## Overview

The middleware intercepts requests to solution app paths and verifies if the user has access to the specific solution before allowing them to proceed.

## How It Works

1. **Path Matching**: The middleware checks if the current URL path matches any of the configured solution app paths
2. **Session Validation**: Verifies that the user has a valid session with authentication tokens
3. **Access Check**: Calls the backend API to verify solution access permissions
4. **Access Control**: Redirects to `/login` if access is denied, allows access if granted

## Configuration

### Solution Apps

The middleware is configured with the following solution apps:

```typescript
const SOLUTION_APPS: SolutionApp[] = [
  {
    name: "AI Docs",
    pathToOpen: "/ai-doc",
    // ... other properties
  },
  {
    name: "Followup", 
    pathToOpen: "/followup",
    // ... other properties
  },
  {
    name: "Landing Page Generator",
    pathToOpen: "/ai-landing-page-generator",
    // ... other properties
  },
  {
    name: "AI Chatbot",
    pathToOpen: "/ai-chatbot",
    // ... other properties
  },
  {
    name: "SEO Content Gen",
    pathToOpen: "/seo-content-gen",
    // ... other properties
  }
];
```

### Environment Variables

Required environment variables:

- `NEXT_PUBLIC_BACKEND_API_URL_WITHOUT_PREFIX`: Base URL for the backend API

## API Integration

### Access Check Endpoint

**Endpoint**: `{BACKEND_API_URL}/napi/v1/common/check-access-solution`

**Method**: POST

**Headers**:
- `Content-Type: application/json`
- `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "solutionName": "AI Chatbot"
}
```

**Response**:
```json
{
  "hasAccess": true,
  "message": "Access granted"
}
```

or

```json
{
  "hasAccess": false,
  "message": "User does not have access to this solution"
}
```

## Middleware Behavior

### Paths Processed

The middleware processes all paths except:
- `/api/*` (API routes)
- `/_next/static/*` (static files)
- `/_next/image/*` (image optimization)
- `/favicon.ico` (favicon)
- `/login` (login page)
- `/` (root path)

### Access Flow

1. **Path Check**: Is the current path a solution app path?
   - No → Continue to next middleware/page
   - Yes → Proceed to session check

2. **Session Check**: Does the user have a valid session?
   - No → Redirect to `/login`
   - Yes → Proceed to access check

3. **Access Check**: Call the backend API to verify solution access
   - `hasAccess: false` → Redirect to `/login`
   - `hasAccess: true` → Allow access to the page

### Error Handling

- **No Session**: Redirects to `/login`
- **No Access Token**: Redirects to `/login`
- **API Call Failure**: Redirects to `/login` (fail-safe)
- **Invalid Solution Name**: Continues without access check

## Files Created/Modified

1. **`middleware.ts`** - Main middleware implementation
2. **`src/types/solution.ts`** - TypeScript types for solution configuration
3. **`src/app/login/page.tsx`** - Login page for access denied scenarios

## Security Considerations

- **Fail-Safe**: On any error, users are redirected to login
- **Token Validation**: Access tokens are validated before API calls
- **Path Matching**: Only configured solution paths are protected
- **Session Dependency**: Requires valid user session

## Testing

To test the middleware:

1. **Valid Access**: Navigate to `/ai-chatbot` with valid session and access
2. **Invalid Access**: Navigate to `/ai-chatbot` without proper permissions
3. **No Session**: Navigate to `/ai-chatbot` without being logged in
4. **Non-Solution Path**: Navigate to `/some-other-path` (should not trigger middleware)

## Customization

### Adding New Solutions

To add a new solution app, update the `SOLUTION_APPS` array in `middleware.ts`:

```typescript
{
  name: "New Solution",
  description: "Description of the new solution",
  icon: "new-solution-icon",
  category: "Category",
  isActive: true,
  pathToOpen: "/new-solution",
  sequence: 6
}
```

### Modifying Redirect Behavior

To change the redirect destination, update the redirect URLs in the middleware:

```typescript
// Instead of '/login', redirect to your main app's login
return NextResponse.redirect(new URL('https://your-main-app.com/login', request.url));
```

### Custom Error Handling

Modify the error handling logic in the `checkSolutionAccess` function to implement custom error responses or logging.
