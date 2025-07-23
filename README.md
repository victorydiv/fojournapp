# Travel Log Application

A comprehensive travel logging web application that allows users to document their journeys with location pins, photos, videos, notes, and activity links. Built with React (TypeScript) frontend and Node.js/Express backend with MySQL database.

## Features

### 🗺️ Interactive Mapping
- Drop pins on Google Maps to mark travel locations
- View all travel entries on an interactive map
- Location-based search and filtering

### 📝 Rich Travel Entries
- Add detailed notes and descriptions for each location
- Upload photos and videos
- Add links to activities, attractions, restaurants, and accommodations
- Tag entries for easy categorization

### 🔍 Advanced Search
- Search by date range, location, keywords, or tags
- Filter by media types (photos, videos)
- Location-based radius search
- Auto-suggestions for locations and tags

### 👤 User Management
- Secure user registration and authentication
- User profiles and settings
- Personal travel log dashboard

### 📱 API Ready
- RESTful API for all functionality
- Ready for mobile app integration
- JWT-based authentication

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for UI components
- **React Router** for navigation
- **React Query** for data fetching
- **Google Maps API** for mapping functionality
- **Axios** for API calls

### Backend
- **Node.js** with Express
- **MySQL** database
- **JWT** for authentication
- **Multer** for file uploads
- **bcryptjs** for password hashing
- **Helmet** for security
- **CORS** enabled

## Project Structure

```
fojournapp/
├── backend/                 # Express API server
│   ├── config/             # Database configuration
│   ├── middleware/         # Authentication middleware
│   ├── routes/            # API routes
│   ├── uploads/           # File upload directory
│   ├── server.js          # Main server file
│   └── package.json
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   ├── services/      # API service functions
│   │   ├── types/         # TypeScript type definitions
│   │   └── hooks/         # Custom React hooks
│   └── package.json
├── database/              # Database schema and migrations
│   └── schema.sql
└── package.json          # Root package.json with scripts

```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fojournapp
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Database Setup**
   - Create a MySQL database named `travel_log`
   - Run the schema script:
     ```bash
     mysql -u your_username -p travel_log < database/schema.sql
     ```

4. **Environment Configuration**
   
   **Backend Configuration** (`backend/.env`):
   ```env
   NODE_ENV=development
   PORT=3001
   
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=travel_log
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   
   # Frontend URL for CORS
   FRONTEND_URL=http://localhost:3000
   
   # Google Maps API Key
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

   **Frontend Configuration** (`frontend/.env`):
   ```env
   REACT_APP_API_BASE_URL=http://localhost:3001/api
   REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
   ```

5. **Start the application**
   ```bash
   npm run dev
   ```

   This will start both frontend (port 3000) and backend (port 3001) simultaneously.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `GET /api/auth/verify` - Verify JWT token

### Travel Entries
- `GET /api/entries` - Get all travel entries (paginated)
- `GET /api/entries/:id` - Get specific travel entry
- `POST /api/entries` - Create new travel entry
- `PUT /api/entries/:id` - Update travel entry
- `DELETE /api/entries/:id` - Delete travel entry

### Media Management
- `POST /api/media/upload/:entryId` - Upload files for entry
- `GET /api/media/entry/:entryId` - Get media files for entry
- `GET /api/media/file/:filename` - Serve media file
- `DELETE /api/media/:fileId` - Delete media file
- `GET /api/media/stats` - Get user media statistics

### Search
- `GET /api/search` - Search travel entries
- `GET /api/search/tags` - Get popular tags
- `GET /api/search/locations` - Get location suggestions
- `GET /api/search/suggestions` - Get search suggestions
- `POST /api/search/advanced` - Advanced search with filters

## Database Schema

### Users Table
- User authentication and profile information
- Supports username/email login
- Password hashing with bcrypt

### Travel Entries Table
- Core travel entry data
- GPS coordinates (latitude/longitude)
- Date and location information
- Linked to users via foreign key

### Media Files Table
- File metadata for uploaded photos/videos
- File type classification
- Secure file serving through API

### Activity Links Table
- External links for activities, attractions, etc.
- Categorized by link type
- Rich metadata support

### Entry Tags Table
- Flexible tagging system
- Supports search and filtering
- Many-to-many relationship with entries

## Development

### Running in Development Mode
```bash
# Install all dependencies
npm run install-all

# Start both frontend and backend
npm run dev

# Or run individually
npm run backend:dev
npm run frontend:dev
```

### Building for Production
```bash
# Build frontend
npm run build
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection prevention with parameterized queries
- CORS configuration
- Rate limiting
- Helmet.js for security headers
- File upload validation

## Future Enhancements

- [ ] Google Maps integration completion
- [ ] Mobile app development (React Native)
- [ ] Real-time collaboration features
- [ ] Advanced analytics and travel statistics
- [ ] Social sharing capabilities
- [ ] Offline mode support
- [ ] Export/import functionality
- [ ] Third-party integrations (Booking.com, TripAdvisor, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.

---

**Note**: This application requires a Google Maps API key for full functionality. Make sure to enable the Maps JavaScript API and Places API in your Google Cloud Console.
