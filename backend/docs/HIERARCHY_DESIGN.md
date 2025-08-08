# ReadyToMeet.me - Account Hierarchy Design

## Overview

This document defines the proper hierarchy structure for the ReadyToMeet.me scheduling application, ensuring clear separation between Users, Accounts, and Calendars.

## Hierarchy Structure

```
User (ReadyToMeet.me Account)
├── Primary Account (Same Google account as User login)
│   ├── Calendar 1
│   ├── Calendar 2
│   └── Calendar N
├── Secondary Account 1 (e.g., Work Gmail)
│   ├── Calendar 1
│   └── Calendar N
└── Secondary Account N (e.g., Personal Gmail 2)
    ├── Calendar 1
    └── Calendar N
```

## Entity Definitions

### 1. User (Top Level)
- **Definition**: The ReadyToMeet.me account holder
- **Authentication**: Uses Google OAuth for login
- **Identity**: Uniquely identified by their primary Google account email
- **Scope**: Owns all Accounts and Calendars in their hierarchy

### 2. Account (Middle Level)
- **Definition**: A Google account connected to the User
- **Types**:
  - **Primary Account**: Always the same Google account used to log into ReadyToMeet.me
  - **Secondary Accounts**: Additional Google accounts (work, personal, etc.)
- **Authentication**: Each has its own Google OAuth tokens
- **Management**: Secondary accounts can be added/removed; Primary account cannot be deleted

### 3. Calendar (Bottom Level)
- **Definition**: Individual calendars from a Google account
- **Ownership**: Always belongs to exactly one Account
- **Lifecycle**: Deleted when parent Account is deleted
- **Types**: Any calendar type from Google (primary, custom, shared, etc.)

## Business Rules

### User Rules
1. A User is created when someone first logs in via Google OAuth
2. A User's identity is tied to their primary Google account email
3. A User cannot be deleted while having active Accounts
4. A User always has exactly one Primary Account

### Account Rules
1. **Primary Account**:
   - Created automatically when User first logs in
   - Uses the same Google account as the User's login
   - Cannot be deleted (system enforced)
   - Always marked as `is_primary = true`
   - Always marked as `is_active = true`

2. **Secondary Accounts**:
   - Added manually by the User
   - Can be work, personal, or other Google accounts
   - Can be deleted by the User
   - Marked as `is_primary = false`
   - Can be activated/deactivated

3. **General Account Rules**:
   - Each Account has its own OAuth tokens
   - Account deletion cascades to all its Calendars
   - Only one Primary Account per User
   - Account emails must be unique per User

### Calendar Rules
1. Calendars are imported from Google Calendar API
2. Each Calendar belongs to exactly one Account
3. Calendar deletion happens when:
   - Parent Account is deleted (cascade)
   - Manual deletion by User
   - Sync determines calendar no longer exists in Google
4. Primary Calendar designation:
   - One Calendar per User can be marked as primary
   - New bookings are created in the Primary Calendar
   - Primary Calendar should belong to an active Account

## Database Schema Design

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Accounts Table (Google Accounts)
```sql
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_id VARCHAR(255) NOT NULL,
    google_email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    google_access_token TEXT NOT NULL,
    google_refresh_token TEXT,
    account_type VARCHAR(50) DEFAULT 'personal', -- 'personal', 'work', 'other'
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, google_email),
    UNIQUE(google_id, user_id)
);
```

### Calendars Table
```sql
CREATE TABLE calendars (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_calendar_id VARCHAR(255) NOT NULL,
    calendar_name VARCHAR(255) NOT NULL,
    calendar_description TEXT,
    background_color VARCHAR(7), -- Hex color code
    foreground_color VARCHAR(7), -- Hex color code
    access_role VARCHAR(50), -- 'owner', 'writer', 'reader'
    timezone VARCHAR(50),
    is_primary BOOLEAN DEFAULT false, -- Primary calendar for new bookings
    is_active BOOLEAN DEFAULT true, -- Include in availability checks
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(account_id, google_calendar_id),
    UNIQUE(user_id, google_calendar_id)
);
```

## Database Constraints & Triggers

### Primary Account Constraint
```sql
-- Ensure exactly one primary account per user
CREATE UNIQUE INDEX idx_one_primary_account_per_user 
ON accounts(user_id) WHERE is_primary = true;
```

### Primary Calendar Constraint
```sql
-- Ensure at most one primary calendar per user
CREATE UNIQUE INDEX idx_one_primary_calendar_per_user 
ON calendars(user_id) WHERE is_primary = true;
```

### Primary Account Protection
```sql
-- Prevent deletion of primary accounts
CREATE OR REPLACE FUNCTION prevent_primary_account_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_primary = true THEN
        RAISE EXCEPTION 'Cannot delete primary account. Primary accounts are protected.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_primary_account_deletion
    BEFORE DELETE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION prevent_primary_account_deletion();
```

### Auto-update Timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_calendars_updated_at
    BEFORE UPDATE ON calendars
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## API Design Patterns

### Account Management
- `GET /api/accounts` - List all accounts for the authenticated user
- `POST /api/accounts` - Add a new secondary account
- `DELETE /api/accounts/:id` - Delete a secondary account (primary protected)
- `PUT /api/accounts/:id/activate` - Activate/deactivate an account

### Calendar Management
- `GET /api/calendars` - List all calendars for the authenticated user
- `POST /api/calendars/sync` - Sync calendars from all active accounts
- `PUT /api/calendars/:id/set-primary` - Set a calendar as primary
- `DELETE /api/calendars/:id` - Delete a specific calendar

## Migration Strategy

### Phase 1: Schema Creation
1. Create new tables with proper constraints
2. Set up triggers and functions
3. Create indexes for performance

### Phase 2: Data Migration
1. Migrate existing users to new schema
2. Create primary accounts from existing user data
3. Migrate existing calendar data to new structure

### Phase 3: Application Update
1. Update models to reflect new hierarchy
2. Update API endpoints
3. Update frontend to handle new structure

## Error Handling

### Common Error Scenarios
1. **Attempting to delete primary account**
   - Error: "Cannot delete primary account"
   - Solution: Inform user that primary accounts are protected

2. **Adding duplicate account**
   - Error: "Account already exists"
   - Solution: Check if account is already connected

3. **Orphaned calendars**
   - Error: "Calendar has no valid account"
   - Solution: Automatic cleanup or manual reassignment

4. **No primary calendar**
   - Warning: "No primary calendar selected"
   - Solution: Prompt user to select a primary calendar

## Security Considerations

1. **OAuth Token Management**
   - Store tokens securely
   - Implement token refresh logic
   - Revoke tokens when accounts are deleted

2. **Access Control**
   - Users can only access their own accounts/calendars
   - Validate ownership on all operations
   - Implement proper authentication middleware

3. **Data Integrity**
   - Use database constraints to enforce rules
   - Implement proper error handling
   - Log all account/calendar operations

## Future Enhancements

1. **Account Types**
   - Add support for different account types (work, personal, family)
   - Custom icons and colors for account types

2. **Calendar Groups**
   - Allow grouping of calendars
   - Batch operations on calendar groups

3. **Advanced Permissions**
   - Read-only accounts
   - Calendar-specific permissions
   - Shared calendar access

---

This hierarchy provides a clean, scalable foundation for multi-account calendar management while maintaining data integrity and user experience.