# Journey Collaboration System

## Overview

The journey collaboration system allows users to share journey planning with other members of the site. Journey owners can invite collaborators who can suggest experiences, while owners maintain approval control.

## Features

### User Roles

- **Owner**: The creator of the journey with full control
  - Can invite/remove collaborators
  - Can approve/reject suggested experiences
  - Can add experiences directly (no approval needed)
  - Can edit journey details

- **Contributor**: Invited collaborators with limited permissions
  - Can view the journey
  - Can suggest experiences (requires owner approval)
  - Cannot edit journey details directly
  - Cannot invite other collaborators

### Collaboration Workflow

1. **Journey Creation**: When a user creates a journey, they automatically become the owner
2. **Inviting Collaborators**: Owners can invite others by email address
3. **Invitation Response**: Invited users receive notifications and can accept/decline
4. **Experience Suggestions**: Contributors can suggest experiences that appear as pending for owner review
5. **Approval Process**: Owners can approve or reject suggested experiences with optional notes

## User Interface

### Navigation Bar
- **Bell Icon**: Shows pending collaboration invitations with a badge count
- Click to view and respond to invitations

### Journey Planning Interface
- **Collaborate Button**: Opens the collaboration management dialog
- Shows collaborators list and pending suggestions (for owners)

### Journey Listings
- **Badges**: Show collaboration status on journey cards
  - "contributor" badge for journeys where you're a collaborator
  - "Shared" badge for journeys shared with you

### Collaboration Manager Dialog

#### Collaborators Tab
- View all current collaborators with their roles and status
- Invite new collaborators by email (owners only)
- Remove collaborators (owners only)

#### Suggestions Tab (Owners Only)
- View pending experience suggestions from contributors
- Approve or reject suggestions with optional review notes
- See who suggested each experience and when

## Database Schema

### Tables Created

- `journey_collaborators`: Stores collaboration relationships
- `journey_experience_approvals`: Tracks approval workflow for suggestions
- `journey_invitations`: Handles email invitations for non-users
- Added columns to `journeys`: `owner_id` field
- Added columns to `journey_experiences`: `suggested_by` and `approval_status` fields

## API Endpoints

### Collaboration Routes (`/api/journeys/`)

- `GET /:journeyId/collaborators` - Get collaborators for a journey
- `POST /:journeyId/invite` - Invite a user to collaborate
- `PUT /invitations/:invitationId/respond` - Accept/decline invitation
- `GET /invitations/pending` - Get user's pending invitations
- `DELETE /:journeyId/collaborators/:collaboratorId` - Remove collaborator
- `GET /:journeyId/suggestions` - Get pending experience suggestions
- `PUT /:journeyId/suggestions/:experienceId` - Approve/reject suggestion

## Usage Examples

### Inviting a Collaborator

1. Open a journey you own
2. Click "Collaborate" button in the toolbar
3. Enter email address in the invite field
4. Add optional message
5. Click "Send Invitation"

### Responding to an Invitation

1. Click the bell icon in the navigation bar
2. View pending invitations
3. Click "Accept" or "Decline" for each invitation

### Suggesting an Experience (as Contributor)

1. Open a shared journey where you're a contributor
2. Add an experience normally
3. Experience will be marked as "pending approval"
4. Owner will receive it in their suggestions list

### Approving Suggestions (as Owner)

1. Open the collaboration dialog
2. Go to "Suggestions" tab
3. Review each pending suggestion
4. Click "Approve" or "Reject"
5. Add optional review notes

## Security Features

- Access control based on user roles
- JWT token authentication required for all operations
- Journey access validation for all collaboration actions
- Email validation for invitations
- Prevention of duplicate collaborations

## Future Enhancements

- Email notifications for invitations and approvals
- Real-time notifications using websockets
- Bulk approval/rejection of suggestions
- Comment system for experience discussions
- Journey templates sharing between users
- Advanced permission levels (view-only, editor, admin)
