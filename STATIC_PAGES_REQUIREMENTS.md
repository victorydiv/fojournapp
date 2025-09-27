# Static Pages Feature Requirements

## Original Request Summary

The user requested a system for creating static pages the links of which would appear in footers across multiple pages of the application, with management capabilities in the admin panel.

## Detailed Requirements

### 1. Database Schema
- **Status**: ✅ COMPLETED
- Use the existing database schema from the SQL files:
  - `backend/migrations/create-static-pages-table.sql`
  - `backend/migrations/2025-09-25-create-static-pages-table.sql`
- **Note**: Database changes have already been applied and sample data exists

### 2. Backend API Requirements

#### Authentication Requirements
- **Management endpoints**: Require authentication (admin only)
- **Public viewing**: No authentication required (must be publicly accessible)

#### Required Endpoints
1. **GET /api/static-pages/public**
   - Returns all published static pages for footer display
   - No authentication required
   - Response format: `{ pages: [{ id, slug, title, meta_title, meta_description }] }`

2. **GET /api/static-pages/public/:slug**
   - Returns full content of a single published page
   - No authentication required
   - Response format: `{ page: { id, slug, title, content, meta_title, meta_description, updated_at } }`

3. **Admin CRUD endpoints** (authenticated):
   - GET /api/admin/static-pages/ - List all pages
   - GET /api/admin/static-pages/:id - Get single page
   - POST /api/admin/static-pages/ - Create new page
   - PUT /api/admin/static-pages/:id - Update page
   - DELETE /api/admin/static-pages/:id - Delete page
   - PUT /api/admin/static-pages/:id/publish - Toggle publish status

### 3. Frontend Requirements

#### Static Page Viewing
- **Route**: `/:slug` (e.g., `/about`, `/privacy`)
- **Component**: StaticPageView
- **Features**:
  - Display full page content with proper HTML rendering
  - SEO meta tags (title, description)
  - Responsive design
  - Error handling for non-existent pages

#### Admin Management Interface
- **Location**: New tab in existing admin panel (`/admin`)
- **Component**: AdminStaticPages
- **Features**:
  - Table view of all static pages
  - Create/Edit/Delete functionality
  - Rich text editor for content
  - Meta fields management (title, description)
  - Publish/Unpublish toggle
  - Preview functionality

#### Footer Integration
- **Pages to include footer**:
  - Main blog page (`/blog`)
  - Individual blog posts (`/blog/:slug`)
  - Landing page (`/`)
  - All public profiles (`/profile/:username`) including all merged public profiles
- **Layout**: Two-column display of static page links
- **Behavior**: 
  - Fetch published pages from API
  - Display as clickable links to `/:slug`
  - Graceful fallback if API fails

### 4. Default Content
- **About Page**: 
  - Slug: `about`
  - Title: "About Fojourn"
  - Content: Description of the platform, mission, features
- **Privacy Policy Page**:
  - Slug: `privacy`  
  - Title: "Privacy Policy"
  - Content: Privacy policy and data handling information

## Current Implementation Status

### ✅ Completed
- Database schema and sample data
- Backend route file structure created
- Frontend component files created
- Basic error handling added to server

### ❌ Issues Identified
1. **Server Stability**: Backend server crashes frequently
2. **API Connectivity**: 404 errors on API calls (double `/api/api/` in URLs)
3. **Public Page Routing**: Static pages don't load properly
4. **Footer Display**: Static pages not appearing in footers
5. **Admin Integration**: Admin panel tab may have issues

### 🔧 Immediate Fixes Needed
1. **Resolve server crashes** - Add proper error handling and debug crash causes
2. **Fix API URL configuration** - Ensure correct API endpoint URLs
3. **Test public page access** - Verify `/about` and `/privacy` load
4. **Verify footer integration** - Confirm static pages appear in footers on specified pages
5. **Test admin functionality** - Ensure admin can create/edit/delete pages

## Success Criteria
- [ ] Server runs stably without crashes
- [ ] Public pages load at `/about` and `/privacy` (or the appropriate slug identified in the static page record)
- [ ] Footer displays "About" and "Privacy Policy" links on specified pages (alongside any other static page links that have been created.  two columns spaced evenly across the footer)
- [ ] Admin can manage static pages through admin panel
- [ ] All API endpoints return proper responses
- [ ] SEO meta tags work correctly on static pages

## Notes
- The implementation should prioritize stability and basic functionality over advanced features
- Error handling should be robust to prevent server crashes
- The system should gracefully handle missing or unpublished pages
- Footer should still render even if static pages API fails