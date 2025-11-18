# Prototype Flow Documentation

## Overview
This document describes how the Agile Project Management prototype works, its flow, and access patterns. This system is designed for efficient project management with role-based access control.

## System Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: Custom components with Tailwind CSS
- **Build Tool**: Vite for fast development and building

### Backend (PHP + MySQL)
- **Language**: PHP 8.x
- **Database**: MySQL/MariaDB
- **API Style**: RESTful API endpoints
- **Authentication**: Session-based authentication
- **CORS**: Configured for cross-origin requests

## User Authentication Flow

### 1. Login Process
```
User enters credentials → Backend validates → Session created → JWT/Session token → Frontend stores auth state → Redirect to dashboard
```

### 2. Access Control
```
Request made → Check session validity → Verify user role → Allow/Deny based on permissions → Return response
```

## User Roles and Permissions

### Administrator (ADMIN)
- **Full system access**
- Can manage teams, projects, and all work items
- Can assign/remove users from teams
- Can change user roles
- Can access all administrative functions

### Scrum Master (SCRUM_MASTER)
- **Project-level management**
- Can manage work items within assigned projects
- Can facilitate sprints and team activities
- Can create EPIC and FEATURE work items
- Can manage team activities

### Project Manager (PROJECT_MANAGER)
- **Project oversight**
- Can add team members to projects
- Can create EPIC and FEATURE work items
- Can manage project settings

### Team Lead (TEAM_LEAD)
- **Team coordination**
- Can create EPIC and FEATURE work items
- Can lead team activities
- Can manage team coordination

### Member (MEMBER)
- **Standard user access**
- Can create STORY, TASK, and BUG work items
- Can edit items they created or are assigned to
- Can view project information

### Viewer (VIEWER)
- **Read-only access**
- Can view projects and work items
- Cannot create or edit work items
- Cannot access administrative functions

## Work Item Hierarchy and Access

### Work Item Types
```
EPIC (Highest Level)
  └── FEATURE
      └── STORY
          ├── TASK
          └── BUG
```

### Edit Access Rules
1. **Admins and Scrum Masters**: Can edit any work item
2. **Item Creator**: Can edit items they created (`reporterId` matches)
3. **Item Assignee**: Can edit items assigned to them (`assigneeId` matches)
4. **Others**: View-only access

### Visual Indicators
- ✏️ **Edit icon**: Shown for items user can edit
- **Hover effects**: Only on editable items
- **Click functionality**: Only works for editable items
- **Visual styling**: Different colors for editable vs read-only items

## Navigation Flow

### 1. Dashboard
```
Login → Dashboard → Shows project overview, recent activity, and quick actions
```

### 2. Team Management
```
Dashboard → Teams → Create/Edit Teams → Manage Members → Assign Roles
```

### 3. Project Management
```
Dashboard → Projects → Create/Edit Projects → Assign Teams → Manage Work Items
```

### 4. Work Item Management
```
Project Details → Overview/Board/List/Calendar → Create/Edit Work Items → Assign Users → Track Progress
```

## Project Views

### Overview Tab
- **Timeline View**: Shows work items on a timeline
- **Hierarchical View**: Displays work items in parent-child relationships
- **Project Information**: Basic project details
- **Deadlines View**: Shows items with due dates

### Board Tab (Kanban)
- **Columns**: TODO, IN_PROGRESS, DONE
- **Drag & Drop**: Move items between statuses
- **Filtering**: By feature, assignee, type
- **Visual Cards**: Show item details and assignee

### List Tab
- **Table View**: Comprehensive list with all details
- **Filtering**: By type, status, priority, assignee
- **Sorting**: Multiple column sorting
- **Bulk Actions**: Edit/delete multiple items

### Calendar Tab
- **Calendar View**: Shows items with due dates
- **Monthly View**: Organized by dates
- **Event Details**: Click to view/edit items

### Settings Tab
- **Project Configuration**: Name, description, team
- **Team Management**: Add/remove members
- **Danger Zone**: Archive/delete project

## Database Schema

### Core Tables
1. **users**: User accounts and authentication
2. **teams**: Team definitions and settings
3. **team_members**: User-team relationships with roles
4. **projects**: Project definitions
5. **work_items**: All work items with hierarchy
6. **project_bug_reports**: Bug reporting system

### Key Relationships
```
users ←→ team_members ←→ teams
teams ←→ projects
projects ←→ work_items
users ←→ work_items (creator/assignee)
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

### Users
- `GET /api/users` - List all users
- `GET /api/users/{id}` - Get user details
- `PATCH /api/users/{id}` - Update user

### Teams
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `GET /api/teams/{id}` - Get team details
- `PATCH /api/teams/{id}` - Update team
- `DELETE /api/teams/{id}` - Delete team
- `POST /api/teams/{id}/members` - Add team member
- `DELETE /api/teams/{teamId}/members/{userId}` - Remove member

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}` - Get project details
- `PATCH /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `GET /api/projects/{id}/team-members` - Get project team members

### Work Items
- `GET /api/projects/{id}/work-items` - List project work items
- `POST /api/work-items` - Create work item
- `GET /api/work-items/{id}` - Get work item details
- `PATCH /api/work-items/{id}` - Update work item
- `DELETE /api/work-items/{id}` - Delete work item

## Security Features

### Authentication
- Session-based authentication
- Secure password hashing
- Session timeout
- CSRF protection

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Owner-based access (creator/assignee)
- Admin override capabilities

### Data Protection
- SQL injection prevention (prepared statements)
- XSS protection
- Input validation and sanitization
- Secure headers

## Deployment Flow

### Development
1. Install dependencies: `npm install`
2. Set up database: Import `database_schema.sql`
3. Configure environment: Copy `.env.example` to `.env`
4. Start development: `npm run dev`

### Production
1. Build frontend: `npm run build`
2. Deploy files to web server
3. Configure database connection
4. Set production environment variables
5. Configure web server (Apache/Nginx)

## Error Handling

### Frontend
- User-friendly error messages
- Loading states and indicators
- Retry mechanisms for failed requests
- Graceful fallbacks

### Backend
- Structured error responses
- Proper HTTP status codes
- Error logging for debugging
- Validation error messages

## Performance Optimizations

### Frontend
- Code splitting and lazy loading
- Optimized bundle size
- Efficient re-rendering with React Query
- Image optimization

### Backend
- Database query optimization
- Proper indexing
- Connection pooling
- Caching strategies

## Future Enhancements

### Planned Features
1. Real-time notifications
2. Advanced reporting and analytics
3. Integration with external tools
4. Mobile app development
5. Advanced workflow automation

### Scalability Considerations
1. Microservices architecture
2. Database sharding
3. CDN integration
4. Caching layers
5. Load balancing

## Troubleshooting Guide

### Common Issues
1. **Login problems**: Check database connection and credentials
2. **Permission errors**: Verify user roles and access rights
3. **Database errors**: Check database schema and connections
4. **Build failures**: Verify dependencies and environment setup

### Debug Mode
- Enable detailed logging
- Check browser console for errors
- Monitor network requests
- Verify API responses

## Support and Documentation

### Getting Help
- Review this documentation
- Check inline code comments
- Review API endpoint documentation
- Contact development team

### Contributing
1. Follow coding standards
2. Write tests for new features
3. Update documentation
4. Submit pull requests for review

---

*This documentation provides a comprehensive overview of the prototype system. For specific implementation details, refer to the source code and inline comments.*