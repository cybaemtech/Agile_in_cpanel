# Complete Invite Team Members System

This document explains the complete "Invite Team Members" functionality that sends email invitations through the fixed invite.php API endpoint.

## System Overview

The invite system consists of:
1. **Frontend Modal** (`invite-modal.tsx`) - User interface for sending invitations
2. **API Endpoint** (`api/invite.php`) - Backend processing and email sending
3. **Email Template** - Professional HTML emails with credentials
4. **Database Integration** - User creation and team assignment

## Frontend Component: InviteModal

### Features
- **Team Selection**: Choose existing team or create new one
- **Email Validation**: Corporate email validation
- **Role Assignment**: MEMBER, LEAD, MANAGER, ADMIN roles
- **Bulk Invitations**: Multiple emails separated by commas
- **Real-time Feedback**: Success/error messages for each invitation

### API Integration
```typescript
// Uses consistent apiRequest for API calls
const response = await apiRequest('POST', '/invite', { 
  email: email.trim(),
  role: inviteData.role,
  teamId: parseInt(inviteData.teamId)
});
```

### Usage
```tsx
<InviteModal 
  isOpen={isInviteModalOpen}
  onClose={() => setInviteModalOpen(false)}
  teams={teams}
  onCreateTeam={handleCreateTeam}
/>
```

## Backend API: invite.php

### Endpoint
```
POST /Agile/api/invite
Content-Type: application/json
```

### Request Format
```json
{
  "email": "user@company.com",
  "role": "MEMBER",
  "teamId": 1
}
```

### Response Format
#### Success (201)
```json
{
  "success": true,
  "message": "User invited successfully and email sent",
  "user": {
    "id": 6,
    "username": "user",
    "email": "user@company.com",
    "role": "MEMBER"
  }
}
```

#### Error (400/409/500)
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

## Email System

### Email Template Features
- **Professional HTML Design** with inline CSS
- **Branded Styling** with company colors
- **Clear Credentials Display** (email, username, password, role)
- **Direct Access Button** to https://cybaemtech.in/Agile/
- **Security Reminders** to change password

### Email Content
```
Subject: Invitation to Agile Project Management Platform
From: Agile Team <noreply@cybaemtech.com>

- Welcome message
- User credentials (username, temporary password)
- Role assignment information
- Direct access link
- Password change reminder
```

## Role System

### Role Mapping
| Frontend Role | Database Role | Team Role | Description |
|---------------|---------------|-----------|-------------|
| ADMIN         | ADMIN         | ADMIN     | Full system access |
| MANAGER       | SCRUM_MASTER  | ADMIN     | Project management |
| LEAD          | SCRUM_MASTER  | ADMIN     | Team leadership |
| MEMBER        | USER          | MEMBER    | Basic team member |

## User Creation Process

1. **Email Validation** - Format and corporate domain check
2. **Duplicate Prevention** - Check if user already exists
3. **Username Generation** - Create unique username from email
4. **Password Generation** - Secure 8-character random password
5. **User Record Creation** - Insert into users table
6. **Team Assignment** - Add to specified team (if provided)
7. **Email Notification** - Send invitation email
8. **Transaction Management** - Rollback on errors

## Error Handling

### Frontend Error Display
- Individual email success/failure tracking
- Detailed error messages in toast notifications
- Console logging for debugging
- Graceful fallback for partial failures

### Backend Error Logging
```php
error_log("Invite API: [operation] - [details]");
```

### Common Error Scenarios
- **Invalid Email Format** (400)
- **User Already Exists** (409)
- **Team Not Found** (400)
- **Database Connection Failed** (500)
- **Email Sending Failed** (success with warning)

## Testing the Complete System

### 1. Frontend Testing
```bash
1. Open https://cybaemtech.in/Agile/
2. Navigate to Teams section
3. Click "Invite Team Members"
4. Fill form:
   - Select team or create new
   - Enter email: test@company.com
   - Select role: MEMBER
5. Click "Send Invitations"
6. Check for success message
```

### 2. Backend API Testing
```bash
curl -X POST https://cybaemtech.in/Agile/api/invite \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "role": "MEMBER",
    "teamId": 1
  }'
```

### 3. Email Delivery Testing
1. Use real email address
2. Check inbox (and spam folder)
3. Verify email formatting
4. Test login with provided credentials
5. Confirm password change requirement

## Configuration Requirements

### Database Tables
- `users` - User accounts
- `teams` - Team definitions  
- `team_members` - Team memberships

### Email Configuration
```php
// cPanel email settings
From: Agile Team <noreply@cybaemtech.com>
Reply-To: noreply@cybaemtech.com
Content-Type: text/html; charset=UTF-8
```

### File Permissions
```bash
chmod 644 api/invite.php
chmod 644 api/index.php
chmod 755 api/
```

## Security Features

### Password Security
- 8-character random passwords
- PASSWORD_DEFAULT hashing
- Mandatory password change on first login

### Database Security
- Prepared statements prevent SQL injection
- Transaction rollback on errors
- Input validation and sanitization

### Email Security
- Proper email headers
- HTML content encoding
- No sensitive data in URLs

## Troubleshooting

### Check Error Logs
Look for entries prefixed with `Invite API:`:
```
Invite API: Database connection successful
Invite API: Generated username - testuser
Invite API: User created successfully with ID - 6
Invite API: Email send result - SUCCESS
```

### Common Issues

#### "Method not allowed"
- Ensure using POST method
- Check API routing in index.php

#### "Invalid JSON data"
- Verify Content-Type header
- Check JSON formatting

#### "Email not received"
- Check spam folder
- Verify email configuration
- Check cPanel email logs

#### "Database connection failed"
- Verify database credentials
- Check MySQL service status
- Review database permissions

## Integration Points

### Team Management
- Creates team memberships automatically
- Supports creating new teams during invite
- Handles role assignments properly

### User Management  
- Integrates with existing user system
- Maintains consistent role mappings
- Generates unique usernames

### Project Assignment
- Users can be assigned to projects
- Role-based permissions apply
- Team membership enables project access

## Deployment Checklist

- [ ] Upload fixed invite.php
- [ ] Update API routing in index.php
- [ ] Deploy frontend with fixed invite modal
- [ ] Test email delivery
- [ ] Verify database connectivity
- [ ] Check error logging
- [ ] Test complete workflow

The complete invite system is now fully functional with proper error handling, professional emails, and seamless integration with the existing Agile platform at `https://cybaemtech.in/Agile/`.