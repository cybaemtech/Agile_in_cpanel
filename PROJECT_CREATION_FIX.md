# Project Creation Fix - cPanel Deployment

This document explains the fixes applied to resolve the "could not create the project" error on the cPanel deployment at `https://cybaemtech.in/Agile/api`.

## Issues Fixed

### 1. Missing API Function
**Problem**: The `createProject` function was referenced but not implemented in `api/projects.php`.

**Solution**: Added comprehensive `createProject` function with:
- Input validation and sanitization
- Database transaction support
- Detailed error logging for debugging
- Proper HTTP status codes
- Field-specific error messages

### 2. API Configuration Issues
**Problem**: API base URL detection wasn't working correctly for the cPanel deployment.

**Solution**: Enhanced `client/src/lib/api-config.ts` with:
- Hostname-based detection for `cybaemtech.in`
- Improved path-based detection
- Better error handling and logging

### 3. Database Connection Issues
**Problem**: Database connection errors weren't being properly logged or handled.

**Solution**: Enhanced `api/config/database.php` with:
- Connection testing
- Detailed error logging
- Better error handling

## Debugging Tools Added

### API Test Endpoint
Created `/api/test` endpoint to help diagnose deployment issues:

```bash
# Test the API endpoint
curl https://cybaemtech.in/Agile/api/test

# Test with POST data
curl -X POST https://cybaemtech.in/Agile/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

This endpoint provides:
- Server environment information
- Database connection status
- Request method and data
- PHP version and configuration

### Enhanced Error Logging
The `createProject` function now logs detailed information:
- Raw input data
- JSON parsing results
- Database query results
- Validation errors
- Transaction status

## Testing Project Creation

### 1. Basic Test
```bash
curl -X POST https://cybaemtech.in/Agile/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "key": "TEST",
    "description": "A test project",
    "createdBy": 1,
    "status": "ACTIVE"
  }'
```

### 2. Expected Success Response
```json
{
  "id": 3,
  "key": "TEST",
  "name": "Test Project", 
  "description": "A test project",
  "status": "ACTIVE",
  "createdBy": 1,
  "teamId": null,
  "startDate": null,
  "targetDate": null,
  "createdAt": "2025-09-22 10:30:00",
  "updatedAt": "2025-09-22 10:30:00"
}
```

### 3. Frontend Testing
Open the application at `https://cybaemtech.in/Agile/` and:
1. Navigate to Projects page
2. Click "New Project" button
3. Fill in the form:
   - **Project Name**: Test Project
   - **Project Key**: TEST
   - **Description**: A test project
   - **Team**: (optional)
   - **Status**: Active
4. Click "Create Project"

## Common Issues & Solutions

### Error: "Database connection failed"
- Check if MySQL service is running on cPanel
- Verify database credentials in `api/config/database.php`
- Check if database `cybaemtechin_agile` exists

### Error: "Project key already exists"
- Use a unique project key (2-10 uppercase letters/numbers)
- Check existing projects in database

### Error: "Invalid user ID"
- Ensure user with ID 1 exists in the `users` table
- Or use a valid user ID from the database

### Error: "API endpoint not found"
- Check if files are uploaded to correct cPanel directory
- Verify `.htaccess` file is present and configured
- Check file permissions (644 for PHP files)

## File Permissions
Ensure correct permissions on cPanel:
```bash
# API files
chmod 644 api/*.php
chmod 644 api/config/*.php

# Make sure directories are executable
chmod 755 api/
chmod 755 api/config/
```

## Database Schema Verification
Ensure the `projects` table exists with correct structure:

```sql
CREATE TABLE `projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('PLANNING','ACTIVE','ARCHIVED','COMPLETED') DEFAULT 'ACTIVE',
  `created_by` int(11) NOT NULL,
  `team_id` int(11) DEFAULT NULL,
  `start_date` timestamp NULL DEFAULT NULL,
  `target_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_key` (`key`)
);
```

## Error Log Location
Check cPanel error logs for detailed debugging information:
- cPanel > Error Logs
- Look for entries containing "PROJECT CREATION DEBUG"

## Validation Rules

### Project Name
- Required field
- Minimum 3 characters

### Project Key  
- Required field
- 2-10 characters
- Uppercase letters and numbers only (A-Z, 0-9)
- Must be unique

### Team ID
- Optional field
- Must reference existing team if provided

### Created By
- Required field
- Must reference existing user

## Next Steps

1. Upload the fixed files to cPanel
2. Test the `/api/test` endpoint
3. Try creating a project via the frontend
4. Check error logs if issues persist
5. Verify database connectivity and permissions

The project creation should now work correctly on the cPanel deployment at `https://cybaemtech.in/Agile/`.