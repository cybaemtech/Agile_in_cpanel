# Access Control Matrix

## Quick Reference: Who Can Do What

### Work Item Creation
| Role | EPIC | FEATURE | STORY | TASK | BUG |
|------|------|---------|-------|------|-----|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scrum Master | ✅ | ✅ | ✅ | ✅ | ✅ |
| Project Manager | ✅ | ✅ | ❌ | ❌ | ❌ |
| Team Lead | ✅ | ✅ | ❌ | ❌ | ❌ |
| Member | ❌ | ❌ | ✅ | ✅ | ✅ |
| Viewer | ❌ | ❌ | ❌ | ❌ | ❌ |

### Work Item Editing
**Anyone can edit work items if they are:**
- The creator (reporterId matches their user ID)
- The assignee (assigneeId matches their user ID)
- Admin or Scrum Master (full access)

### Team Management
| Action | Admin | Scrum Master | Others |
|--------|-------|--------------|--------|
| Create Teams | ✅ | ❌ | ❌ |
| Edit Teams | ✅ | ❌ | ❌ |
| Add Members | ✅ | ✅ | ❌ |
| Remove Members | ✅ | ✅ | ❌ |
| Change Roles | ✅ | ❌ | ❌ |

### Project Management
| Action | Admin | Scrum Master | Project Manager | Others |
|--------|-------|--------------|-----------------|--------|
| Create Projects | ✅ | ✅ | ✅ | ❌ |
| Edit Projects | ✅ | ✅ | ❌ | ❌ |
| Delete Projects | ✅ | ❌ | ❌ | ❌ |
| Archive Projects | ✅ | ✅ | ❌ | ❌ |

## Visual Indicators

### In the UI
- **✏️ Icon**: Shows next to items you can edit
- **Hover Effects**: Only active on editable items
- **Blue Dot**: In legend, indicates editable items
- **Gray Dot**: In legend, indicates view-only items

### Tooltips
- **"Click to edit"**: For editable items
- **"View only - Created by: [Name]"**: For non-editable items
- **"No permission"**: For restricted actions

## Navigation Access

### Pages Everyone Can Access
- Dashboard
- Projects (view)
- Calendar
- Reports

### Admin/Scrum Master Only
- Team Management
- User Management
- Project Settings (edit)
- System Configuration

### Creator/Assignee Only
- Edit specific work items
- Update work item status
- Add comments/attachments

## Troubleshooting Access Issues

### Can't Edit Work Item
1. Check if you created it (are you the reporter?)
2. Check if it's assigned to you
3. Verify your role (Admin/Scrum Master have full access)

### Can't See Edit Button
- Item was created by someone else
- Item is not assigned to you
- You don't have the required role level

### Can't Access Team Management
- Only Admins can manage teams
- Contact your system administrator

### Can't Create Certain Work Items
- Check the creation matrix above
- Members can only create STORY, TASK, BUG
- Higher roles needed for EPIC, FEATURE

---

*This matrix provides a quick reference for understanding access permissions in the system.*