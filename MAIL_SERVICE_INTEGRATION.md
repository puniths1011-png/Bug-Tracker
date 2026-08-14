# Mail Service Integration - Implementation Summary

## Overview
The Wizzybug backend has been updated to use a separate Mail Service instead of sending emails directly through Resend/Gmail. All user invitations now go through the Mail Service API.

## Files Modified

### 1. **src/utils/mailer.ts**
**Changes:**
- Removed Resend/Gmail email sending logic
- Added new `sendInviteViaMail()` function that:
  - Makes a POST request to `${MAIL_SERVICE_URL}/send-invite`
  - Sends JSON body with: `email`, `name`, `inviteLink`
  - Includes comprehensive error handling
  - Logs all requests and responses
- Updated `isRealMailerConfigured()` to check for `MAIL_SERVICE_URL` instead of `RESEND_API_KEY`
- Kept legacy `sendMail()` function for backwards compatibility (throws error with helpful message)

**Key Implementation:**
```typescript
export const sendInviteViaMail = async (opts: {
  email: string;
  name: string;
  inviteLink: string;
}): Promise<{ success: boolean; message: string }>
```

### 2. **src/controllers/authController.ts**
**Changes:**
- Updated import from `sendMail` to `sendInviteViaMail`
- Modified `inviteUser()` function to:
  - Call `sendInviteViaMail()` instead of `sendMail()`
  - Pass: email, name, and inviteLink to Mail Service
  - Update error handling to reference Mail Service instead of Resend
  - Updated response hints for better troubleshooting

**No Changes To:**
- User validation logic
- Invitation token generation
- Database operations (User.create, User.findOne, etc.)
- Authentication flow
- `acceptInvite()` function
- Role-based authorization

## Environment Variables

### Add to Your Backend .env
```
MAIL_SERVICE_URL=https://YOUR-MAIL-SERVICE-URL
FRONTEND_URL=https://YOUR-FRONTEND-URL
```

### Remove/Keep From Backend .env (No Longer Used)
These credentials belong only to the Mail Service, NOT the Wizzybug backend:
- ❌ `RESEND_API_KEY` - Remove (backend no longer uses)
- ❌ `GMAIL_USER` - Remove (backend no longer uses)
- ❌ `GMAIL_APP_PASSWORD` - Remove (backend no longer uses)
- ❌ `MAIL_FROM` - Remove (backend no longer uses)

### Keep in Backend .env
These variables are still required:
- ✅ `MONGO_URI` - Database connection
- ✅ `JWT_SECRET` - Authentication token signing
- ✅ `FRONTEND_URL` - Used for invitation links
- ✅ `PORT` - Server port
- ✅ `CLOUDINARY_*` - Image uploads (if using)

## Render Deployment Configuration

### Backend Environment Variables
Set these in your Render dashboard for the backend service:

```
# Core
MONGO_URI=mongodb+srv://[username]:[password]@[cluster]...
JWT_SECRET=your-secret-key-here
PORT=5000

# Mail Service
MAIL_SERVICE_URL=https://your-mail-service-url.com

# Frontend Integration
FRONTEND_URL=https://your-deployed-frontend-url.com

# Optional: Cloudinary (if using image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Do NOT set these (they're no longer used by backend):**
- `RESEND_API_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `MAIL_FROM`

### Frontend Environment Variables
Set these in your Render dashboard for the frontend service:

```
VITE_API_URL=https://your-deployed-backend-url.com
```

## Mail Service API Contract

The Mail Service is expected to provide this endpoint:

**Endpoint:** `POST ${MAIL_SERVICE_URL}/send-invite`

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "inviteLink": "https://your-frontend-url.com/accept-invite?token=uuid-token"
}
```

**Expected Response (Success - 200):**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  ...
}
```

**Expected Response (Failure):**
- Any non-200 status code will be treated as an error
- Backend will log the status and error message
- User creation will be rolled back (pending user deleted)

## Error Handling

### When Mail Service is Down/Unavailable
- Backend returns **502 Bad Gateway** status
- Pending user is **automatically deleted** (to prevent "ghost" invites)
- Admin receives helpful error message with troubleshooting hints

### When Mail Service is Not Configured
- Invites are created in database (status: pending)
- Backend responds with message: "Invite created, but Mail Service is not configured"
- Response includes `mailMode: 'unconfigured'`

## Testing the Integration

### Local Development
1. Set `MAIL_SERVICE_URL` to your local Mail Service (e.g., `http://localhost:3001`)
2. Ensure Mail Service is running and listening on that URL
3. Call `POST /api/auth/invite` with:
   ```json
   {
     "name": "Test User",
     "email": "test@example.com",
     "role": "developer"
   }
   ```
4. Check backend logs for success/failure messages

### On Render
1. Ensure `MAIL_SERVICE_URL` is set to your deployed Mail Service URL
2. Ensure Mail Service is publicly accessible from Render
3. Test invitation flow through frontend

## Backwards Compatibility Notes

- The old `sendMail()` function still exists but now throws an error
- If any other code was calling `sendMail()`, it will fail with a clear error message
- The `isRealMailerConfigured()` function now checks for `MAIL_SERVICE_URL` instead of `RESEND_API_KEY`

## Rollback Instructions

If you need to go back to Resend/Gmail:
1. Restore original `src/utils/mailer.ts` (with Resend imports)
2. Restore original `src/controllers/authController.ts` (importing `sendMail`)
3. Add back `RESEND_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` to .env
4. Reinstall `resend` package if it was removed

## Next Steps

1. **Deploy Mail Service** - Ensure your Mail Service is deployed and accessible
2. **Update Render Environment** - Set `MAIL_SERVICE_URL` in Render dashboard
3. **Remove Old Credentials** - Delete `RESEND_API_KEY`, `GMAIL_USER`, etc. from Render
4. **Test Invitations** - Send a test invite from the admin panel
5. **Monitor Logs** - Check Render logs for any Mail Service errors
