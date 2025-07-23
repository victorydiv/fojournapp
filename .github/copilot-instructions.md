<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Travel Log Application - Copilot Instructions

This is a full-stack travel log web application project with the following structure:

## Project Overview
- **Backend**: Node.js/Express REST API with MySQL database
- **Frontend**: React application with Google Maps API integration
- **Authentication**: JWT-based user login system
- **Database**: MySQL for storing travel entries, user data, and media metadata

## Key Features
- User authentication and authorization
- Interactive Google Maps with pin dropping functionality
- Travel entry management (notes, photos, videos, links)
- Search functionality by date, location, and keywords
- RESTful API for potential mobile app integration

## Development Guidelines
- Follow REST API conventions for backend endpoints
- Use proper error handling and validation
- Implement secure authentication practices
- Follow React best practices for component structure
- Use environment variables for sensitive configuration
- Maintain separation between frontend and backend concerns

## Database Schema
- Users table for authentication
- Travel entries with location data
- Media files metadata
- Proper foreign key relationships

## API Endpoints
Design RESTful endpoints following these patterns:
- GET/POST /api/auth/* for authentication
- GET/POST/PUT/DELETE /api/entries/* for travel entries
- GET/POST /api/media/* for media uploads
- GET /api/search/* for search functionality
