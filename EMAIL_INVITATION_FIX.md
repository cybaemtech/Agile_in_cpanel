# Email Invitation System Fix

This document explains the fixes applied to resolve the 500 Internal Server Error in the email invitation system at `https://cybaemtech.in/Agile/api/invite`.

## Issues Fixed

### 1. Database Connection Problems
**Problem**: The invite.php was using `config/init_db.php` which includes session handling that might cause conflicts.

**Solution**: 
- Changed to use the same database connection pattern as other API endpoints
- Uses `config/database.php` directly for cleaner connection handling
- Removed dependency on session handling for invite operations

### 2. Inconsistent Error Handling
**Problem**: Error responses were inconsistent and lacked proper HTTP status codes.

**Solution**:
- Added comprehensive error logging with prefixed messages (`Invite API:`)
- Implemented proper HTTP status codes (400, 409, 500, 201)
- Enhanced JSON error responses with detailed messages

### 3. Missing API Routing
**Problem**: The invite endpoint wasn't properly registered in the main API router.

**Solution**:
- Added `invite` to the regex pattern in `api/index.php`
- Added routing case for invite endpoint

### 4. Email Template and URL Issues
**Problem**: 
- Basic email template with poor formatting
- Missing proper invite URL pointing to production site

**Solution**:
- Created professional HTML email template with styling
- Updated invite URL to `https://cybaemtech.in/Agile/`
- Added comprehensive user information in email

## Email Invitation Features

### Enhanced Email Template
The new email includes:
- Professional HTML formatting with inline CSS
- Clear credentials display (email, username, temporary password, role)
- Prominent access button linking to the platform
- Security reminder to change password
- Branded styling with proper colors

### User Creation Process
1. **Validation**: Email format and required fields
2. **Duplicate Check**: Prevents duplicate users
3. **Username Generation**: Creates unique usernames from email
4. **Password Generation**: Secure 8-character random passwords
5. **Role Mapping**: Maps frontend roles to database roles
6. **Team Assignment**: Optional team membership
7. **Email Notification**: Professional invitation email

### Role Mapping
```php
Frontend Role → Database Role → Team Role
ADMIN        → ADMIN         → ADMIN
MANAGER      → SCRUM_MASTER  → ADMIN  
LEAD         → SCRUM_MASTER  → ADMIN
MEMBER       → USER          → MEMBER
```

## API Endpoint Usage

### Send Invitation
```bash
POST https://cybaemtech.in/Agile/api/invite
Content-Type: application/json

{
  "email": "user@example.com",
  "role": "MEMBER",
  "teamId": 1
}
```

### Success Response
```json
{
  "success": true,
  "message": "User invited successfully and email sent",
  "user": {
    "id": 6,
    "username": "user",
    "email": "user@example.com", 
    "role": "MEMBER"
  }
}
```

### Error Responses

#### Email Already Exists (409)
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

#### Invalid Email (400)
```json
{
  "success": false,
  "message": "Invalid email format"
}
```

#### Database Error (500)
```json
{
  "success": false,
  "message": "Failed to create user invitation: [error details]"
}
```

## Email Configuration

### SMTP Settings
The system uses PHP's built-in `mail()` function. For production use, consider configuring:

1. **cPanel Email Settings**:
   - Go to cPanel → Email Accounts
   - Ensure domain has proper MX records
   - Configure SPF and DKIM records

2. **Alternative SMTP** (if needed):
   - Consider using PHPMailer for external SMTP
   - Services like SendGrid, Mailgun for better delivery

### Email Headers
```php
From: Agile Team <noreply@cybaemtech.com>
Reply-To: noreply@cybaemtech.com
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8
```

## Testing the Invitation System

### 1. Basic Invitation Test
```bash
curl -X POST https://cybaemtech.in/Agile/api/invite \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "role": "MEMBER"
  }'
```

### 2. Team Invitation Test
```bash
curl -X POST https://cybaemtech.in/Agile/api/invite \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@example.com", 
    "role": "MANAGER",
    "teamId": 1
  }'
```

### 3. Frontend Testing
1. Login to the Agile platform
2. Navigate to Teams or Users management
3. Click "Invite User" or similar button
4. Fill in the invitation form:
   - **Email**: Valid email address
   - **Role**: Select appropriate role
   - **Team**: Optional team assignment
5. Submit the form
6. Check for success message
7. Verify email delivery (check spam folder)

## Error Debugging

### Check Error Logs
Look for entries prefixed with `Invite API:` in cPanel error logs:

```
Invite API: Database connection successful
Invite API: Raw input - {"email":"test@example.com","role":"MEMBER"}
Invite API: Generated username - test
Invite API: User created successfully with ID - 6
Invite API: Email send result - SUCCESS
```

### Common Issues

#### "Database connection failed"
- Check MySQL service status in cPanel
- Verify database credentials in `config/database.php`
- Ensure database exists and is accessible

#### "User with this email already exists"
- This is expected behavior - check if user really exists
- Use different email or update existing user

#### Email not received
- Check spam/junk folder
- Verify domain's email configuration
- Check cPanel email logs
- Consider using external SMTP service

#### "Failed to create user"
- Check database permissions
- Verify table structure matches schema
- Review error logs for specific SQL errors

## Security Considerations

### Password Security
- Temporary passwords are 8 characters (secure random)
- Passwords are hashed using `PASSWORD_DEFAULT`
- Users must change password on first login

### Email Security
- Uses proper email headers to prevent spam classification
- HTML email with encoded content
- No sensitive information exposed in URLs

### Database Security
- Uses prepared statements to prevent SQL injection
- Transaction rollback on errors
- Proper error handling without exposing internals

## File Structure
```
api/
├── invite.php (Main invitation endpoint)
├── index.php (Updated with invite routing)
├── config/
│   ├── database.php (Database connection)
│   └── cors.php (CORS headers)
```

## Next Steps

1. **Upload Fixed Files**: Deploy the updated files to cPanel
2. **Test API Endpoint**: Verify invite functionality works
3. **Configure Email**: Ensure proper email delivery setup
4. **Monitor Logs**: Check for any remaining errors
5. **User Testing**: Test complete invitation workflow

The email invitation system should now work correctly at `https://cybaemtech.in/Agile/api/invite` with proper error handling, logging, and professional email delivery.