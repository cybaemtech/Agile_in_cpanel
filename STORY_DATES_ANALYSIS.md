# Story Start Date and End Date Implementation

## Current Status ✅

The start date and end date fields are **already fully implemented** in the system:

### ✅ Database Layer
- `start_date` and `end_date` columns exist in `work_items` table
- Fields are properly indexed and can store timestamp values
- API endpoints already handle these fields in CRUD operations

### ✅ Backend API  
- `api/work-items.php` fully supports start_date and end_date
- Fields are included in SELECT, INSERT, and UPDATE operations
- Data is properly formatted and returned to frontend

### ✅ TypeScript Schema
- `shared/schema.ts` includes startDate and endDate fields
- Proper typing is defined for all work item operations

## What Needs to Be Changed ⚠️

The **only missing piece** is UI access for STORY type work items. Currently, the start/end date fields are only shown for:
- ✅ EPIC type items  
- ✅ FEATURE type items
- ❌ STORY type items (this is what needs to be fixed)

## Implementation Required

Need to modify these UI components to also show date fields for STORY types:

1. **CreateItemModal** (`client/src/components/modals/create-item-modal.tsx`)
2. **EditItemModal** (`client/src/components/modals/edit-item-modal.tsx`)

Both components currently have the condition:
```typescript
{(selectedType === "EPIC" || selectedType === "FEATURE") && (
  // Date fields here
)}
```

This needs to be changed to:
```typescript  
{(selectedType === "EPIC" || selectedType === "FEATURE" || selectedType === "STORY") && (
  // Date fields here
)}
```

## Files to Modify

- ✏️ `client/src/components/modals/create-item-modal.tsx` - Line ~498
- ✏️ `client/src/components/modals/edit-item-modal.tsx` - Line ~470

## Impact

Once these changes are made:
- ✅ Stories will show start date and end date input fields  
- ✅ Dates will be saved to database when creating/editing stories
- ✅ Timeline and calendar views will include story dates
- ✅ All existing functionality for EPICs and FEATUREs remains unchanged