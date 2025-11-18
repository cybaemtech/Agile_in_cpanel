# Access Control Fix for Team Members and Project Creation

## Issue Summary
User cannot access "Team Members" or create new Projects & Teams due to role-based access control restrictions.

## Root Cause Analysis
1. **Database Issue**: Users may not have proper roles assigned in the `user_role` column
2. **Frontend Restrictions**: Code checks for `ADMIN` or `SCRUM_MASTER` roles to show UI elements
3. **Backend Restrictions**: API endpoints may be blocking access based on roles

## Current Problems Identified
1. **Frontend Role Check** (in `client/src/pages/teams.tsx`):
   ```typescript
   const isAdminOrScrum = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SCRUM_MASTER');
   ```
   This blocks access to team/project creation for regular users.

2. **Backend API Issues**:
   - Teams creation requires authentication but may have role restrictions
   - Project APIs may have similar restrictions

## Solutions

### Quick Fix (Temporary - for immediate testing)

1. **Update Frontend Role Check** to allow all authenticated users:
   ```typescript
   // In client/src/pages/teams.tsx, temporarily change line ~152:
   const isAdminOrScrum = currentUser; // Allow all authenticated users
   ```

2. **Verify Database Configuration**:
   - Database auto-detection should use local XAMPP settings
   - Local database: `agile` with user `root` (no password)
   - Production database: `cybaemtechin_agile` with production credentials

### Permanent Fix (Recommended)

1. **Set Up Local Database**:
   ```bash
   # Start XAMPP services (Apache + MySQL)
   # Run setup-local-db.sql in phpMyAdmin
   ```

2. **Test with Proper User Roles**:
   - Admin: admin@example.com / password (set as ADMIN role)
   - Scrum: scrum@example.com / password (set as SCRUM_MASTER role)  
   - User: user@example.com / password (set as USER role)

3. **Update Access Control Logic** to be more permissive:
   - Allow authenticated users to view teams they're members of
   - Allow team members to access team member lists
   - Allow appropriate roles to create projects/teams

## Files Modified/Created

1. **api/config/database.php** - Auto-detects local vs production environment
2. **setup-local-db.sql** - Complete local database setup
3. **fix_user_roles.php** - Script to assign proper roles to existing users

## Next Steps

1. **Immediate**: Start XAMPP (Apache + MySQL) 
2. **Database Setup**: Import setup-local-db.sql via phpMyAdmin
3. **Test Access**: Login with admin@example.com / password
4. **Verify**: Should now have full access to create teams/projects

## Default Login Credentials (After Database Setup)
- **Admin**: admin@example.com / password 
- **Scrum Master**: scrum@example.com / password
- **User**: user@example.com / password

All passwords are 'password' (hashed with bcrypt in database).