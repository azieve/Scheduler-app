# Scheduler App

A comprehensive scheduling application similar to Calendly/Cal.com that allows users to sync their Gmail calendars and generate scheduling links for seamless meeting booking.

## Features

### Core Functionality
- 📅 Gmail calendar synchronization
- 🔗 Generate shareable scheduling links
- 🌐 Public booking pages with available time slots
- ⚙️ Configurable meeting types (name, duration, preferences)
- 👥 Team scheduling capabilities
- 🔒 Secure authentication and data handling

### Technical Stack
- **Backend**: Node.js with Express
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL with Redis caching
- **Authentication**: JWT with Google OAuth
- **Infrastructure**: Docker, AWS-ready deployment

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Installation

1. **Clone and setup**
   ```bash
   git clone https://github.com/azieve/Scheduler-app.git
   cd Scheduler-app
   npm install
   ```

2. **Start database services**
   ```bash
   npm run db:up
   ```

3. **Configure environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Backend API server on http://localhost:3001
   - Frontend React app on http://localhost:3000

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run test` - Run all tests
- `npm run build` - Build for production
- `npm run db:up` - Start database containers
- `npm run db:reset` - Reset database with fresh data

## Project Structure

```
scheduler-app/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── services/       # Business logic
│   │   └── config/         # Configuration files
│   └── tests/              # Backend tests
├── frontend/               # React TypeScript app  
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
├── infrastructure/         # Database schemas and deployment
├── docs/                   # Documentation
└── .github/workflows/      # CI/CD pipelines
```

## Development Phases

### Phase 1: MVP (Current)
- [x] Project setup and architecture
- [ ] User authentication with Google OAuth
- [ ] Basic calendar integration
- [ ] Meeting type creation
- [ ] Public booking pages

### Phase 2: Enhanced Features
- [ ] Advanced availability settings
- [ ] Email notifications
- [ ] Calendar event creation
- [ ] Booking management dashboard

### Phase 3: Team Features
- [ ] Team/organization support
- [ ] Collective availability
- [ ] Advanced scheduling rules

### Phase 4: Enterprise
- [ ] Analytics and reporting
- [ ] Custom branding
- [ ] API access
- [ ] Advanced integrations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## Environment Variables

Key environment variables (see `.env.example` files):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID` - Google OAuth credentials
- `GOOGLE_CLIENT_SECRET` - Google OAuth credentials

## API Documentation

Once running, API documentation is available at:
- Development: http://localhost:3001/api
- Health check: http://localhost:3001/api/health

## License

MIT License - see LICENSE file for details.