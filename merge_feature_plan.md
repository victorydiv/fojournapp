# Account Merging Feature Plan

## 🎯 Core Concept
Two existing users can merge their accounts to share private memories while maintaining individual data ownership. They can also unmerge later while preserving what each person contributed during the merged period.

## 📋 Finalized Requirements

### User Experience Rules
- **Merge URL Format:** `john-jane-travels` style (first-last-travels)
- **Equal Access:** Both users have equal rights to the merged account and can unmerge
- **Content Display:** Chronological order mixing both users' content
- **Merge Exclusivity:** Users can only be in ONE merge at a time
- **Invitation Limits:** Only ONE active invitation per user (must cancel existing to send new)
- **Unmerge Cooling Period:** 0 days initially (configurable via admin panel)

## 🏗️ Database Architecture

### New Tables

#### `account_merge_invitations`
```sql
- id (Primary Key)
- inviter_user_id (Foreign Key to users)
- invited_user_id (Foreign Key to users)
- status ENUM('pending', 'accepted', 'declined', 'cancelled')
- invitation_message TEXT
- created_at, responded_at, expires_at (7 days)
- UNIQUE(inviter_user_id), UNIQUE(invited_user_id) -- Only one invitation per user
```

#### `account_merges`
```sql
- id (Primary Key)
- user1_id, user2_id (Foreign Keys to users)
- merge_slug VARCHAR(100) UNIQUE -- e.g., "john-jane-travels"
- merged_at TIMESTAMP
- merge_settings JSON -- Display preferences
- UNIQUE(user1_id), UNIQUE(user2_id) -- Only one merge per user
```

#### `account_merge_history`
```sql
- id (Primary Key)
- user1_id, user2_id (Foreign Keys)
- action ENUM('merged', 'unmerged')
- merge_slug, merge_duration (days)
- action_initiated_by (Foreign Key to users)
- reason TEXT, action_at TIMESTAMP
```

#### `merge_url_redirects`
```sql
- id (Primary Key)
- original_username, original_public_username
- merge_slug, user_id
- created_at TIMESTAMP
```

#### `admin_settings` (new table for configurable settings)
```sql
- id (Primary Key)
- setting_key VARCHAR(100) UNIQUE
- setting_value TEXT
- setting_type ENUM('string', 'number', 'boolean', 'json')
- description TEXT
- updated_at TIMESTAMP
```

### Modified Tables

#### `users` table additions
```sql
- merge_id INT NULL (Foreign Key to account_merges)
- original_public_username VARCHAR(50) NULL (backup for unmerging)
- is_merged BOOLEAN DEFAULT FALSE
```

## 🔄 User Experience Flow

### Merging Process
1. **Initiate:** User A goes to Profile → "Account Merging" section
2. **Invite:** User A enters User B's email/username (cancels any existing invitation)
3. **Notify:** User B receives in-app notification and email
4. **Accept:** User B accepts → System creates merged profile
5. **Result:** Both users share private content, get merged public URL

### Merged Account Behavior
- **Privacy:** Both users see each other's private memories
- **Public Profile:** Single URL with both names, chronological content
- **Individual Ownership:** New uploads maintain original user ownership
- **Equal Rights:** Both users can unmerge at any time

### Unmerging Process
1. **Initiate:** Either user clicks "Unmerge Accounts" (no waiting period)
2. **Confirm:** System asks for confirmation and optional reason
3. **Split:** Accounts separate, each keeps their contributed content
4. **URLs:** Old merged URL shows choice page: "View John's Profile | View Jane's Profile"

## 🛠️ Technical Implementation

### Phase 1: Database & Admin Settings
- [x] Create database schema
- [x] Create migration script
- [ ] Run migration to create tables
- [ ] Add admin settings table and default cooling period setting
- [ ] Create database views for easy merge lookups

### Phase 2: Backend API Endpoints
- [ ] `POST /api/merge/invite` - Send merge invitation (cancel existing if needed)
- [ ] `GET /api/merge/invitations` - Get user's pending invitations
- [ ] `POST /api/merge/accept/:invitationId` - Accept invitation
- [ ] `POST /api/merge/decline/:invitationId` - Decline invitation
- [ ] `POST /api/merge/cancel/:invitationId` - Cancel sent invitation
- [ ] `GET /api/merge/status` - Get current merge status
- [ ] `POST /api/merge/unmerge` - Split accounts
- [ ] `GET /api/admin/settings/merge-cooling-period` - Admin: Get cooling period
- [ ] `PUT /api/admin/settings/merge-cooling-period` - Admin: Update cooling period

### Phase 3: Data Access Layer Updates
- [ ] Update memory/entry queries to include merged partner's content
- [ ] Modify privacy checks for cross-user access in merged accounts
- [ ] Create helper functions for merge-aware data retrieval
- [ ] Ensure data ownership tracking for clean unmerging

### Phase 4: Public Profile Integration
- [ ] Update `/u/:username` route to handle merged profiles
- [ ] Create `/u/:mergeSlug` route for merged profiles
- [ ] Implement URL redirects from individual usernames to merge slug
- [ ] Create choice page for post-unmerge URLs
- [ ] Update SEO meta tags for merged profiles

### Phase 5: Frontend Components
- [ ] Add "Account Merging" section to Profile page
- [ ] Create merge invitation form with validation
- [ ] Build invitation management interface (sent/received)
- [ ] Add merge status display with partner info
- [ ] Create unmerge confirmation dialog
- [ ] Add merge invitation notifications
- [ ] Update admin panel with cooling period setting

### Phase 6: URL Routing & Choice Interface
- [ ] Implement proper route handling for merged profiles
- [ ] Create choice page component for unmerged profile access
- [ ] Handle 404s gracefully for invalid merge slugs
- [ ] Implement canonical URL management

## 🔧 Key Implementation Details

### Merge Slug Generation
```javascript
// Format: "firstname-firstname-travels"
function generateMergeSlug(user1, user2) {
  const name1 = user1.firstName?.toLowerCase() || user1.username.toLowerCase();
  const name2 = user2.firstName?.toLowerCase() || user2.username.toLowerCase();
  const baseSlug = `${name1}-${name2}-travels`;
  
  // Handle duplicates by adding numbers
  return ensureUniqueSlug(baseSlug);
}
```

### Data Access Pattern
```javascript
// Get memories for merged account
async function getMemoriesForUser(userId, includeMerged = true) {
  const userIds = [userId];
  
  if (includeMerged) {
    const mergeInfo = await getUserMergeInfo(userId);
    if (mergeInfo?.partnerId) {
      userIds.push(mergeInfo.partnerId);
    }
  }
  
  return getMemoriesByUserIds(userIds);
}
```

### Admin Settings Management
```javascript
// Configurable cooling period
const COOLING_PERIOD_SETTING = 'merge_unmerge_cooling_period_days';

async function canUserUnmerge(userId) {
  const coolPeriod = await getAdminSetting(COOLING_PERIOD_SETTING, 0);
  const mergeInfo = await getUserMergeInfo(userId);
  
  if (!mergeInfo) return false;
  
  const daysSinceMerge = (Date.now() - mergeInfo.mergedAt) / (1000 * 60 * 60 * 24);
  return daysSinceMerge >= coolPeriod;
}
```

## 🎯 Success Criteria

### Functional Requirements
- [x] Users can send merge invitations (one at a time)
- [ ] Users can accept/decline invitations
- [ ] Merged accounts share private content access
- [ ] Public profiles merge with chronological content
- [ ] Individual URLs redirect to merged profile
- [ ] Either user can unmerge immediately
- [ ] Unmerged URLs show choice page
- [ ] Admin can configure cooling period

### Technical Requirements
- [ ] All data ownership preserved through merge/unmerge cycles
- [ ] Proper URL redirects and SEO handling
- [ ] Clean database constraints prevent invalid states
- [ ] Comprehensive error handling and validation
- [ ] Responsive UI for all merge-related interactions

## 🚀 Next Steps

1. **Run Database Migration** - Apply the new schema
2. **Implement Backend APIs** - Create all merge-related endpoints
3. **Update Data Access** - Modify queries for merge-aware content
4. **Build Frontend Interface** - Create user-facing merge components
5. **Test Complete Flow** - Verify merge → use → unmerge → choice page

---

*Last Updated: September 21, 2025*
*Status: Ready for Implementation*