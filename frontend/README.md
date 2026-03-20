# SmartLogix Frontend

React-based web dashboard for the SmartLogix Route Optimizer system.

## Features

- 📊 **Dashboard**: Real-time stats and quick actions
- 🚚 **Vehicle Management**: CRUD operations for fleet management
- 📦 **Job Booking**: Book jobs with automatic vehicle matching and backhaul coordination
- 🚛 **Trip Tracking**: Monitor all jobs and trips
- 🔍 **Backhaul Search**: Find profitable return loads

## Tech Stack

- **React** with Vite
- **React Router** for navigation
- **Axios** for API communication
- **Modern CSS** with gradient backgrounds and animations

## Getting Started

### Prerequisites

- Node.js (v14+)
- SmartLogix backend running on `http://localhost:5001`

### Installation

```bash
cd frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will run on `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx       # Main dashboard with stats
│   │   ├── Vehicles.jsx         # Vehicle management
│   │   ├── BookJob.jsx          # Job booking form
│   │   ├── Trips.jsx            # Trip tracking
│   │   └── BackhaulSearch.jsx   # Backhaul finder
│   ├── services/
│   │   └── api.js               # API service layer
│   ├── App.jsx                  # Main app with routing
│   └── index.css                # Global styles
├── .env                         # Environment variables
└── package.json
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5001/api
```

## Features Breakdown

### Dashboard
- Real-time statistics (vehicles, trips, jobs)
- Quick action buttons
- System features overview

### Vehicle Management
- Add new vehicles with detailed info
- View fleet overview in table format
- Status badges (available, in-transit, maintenance, offline)

### Job Booking
- Comprehensive form with all cargo details
- Pickup and delivery location inputs
- Automatic vehicle matching (60% capacity / 40% distance)
- Automatic backhaul search
- Success result display with trip details

### Trip Tracking
- Table view of all jobs
- Status filtering
- Job type identification (primary vs backhaul)

### Backhaul Search
- Location-based search with custom radius
- Score-based results ranking
- Distance and revenue calculations

## API Integration

All API calls are handled through `src/services/api.js`:

- `vehicleAPI`: Vehicle CRUD operations
- `jobAPI`: Job booking and backhaul search
- `tripAPI`: Trip tracking and status updates

## Styling

Modern, professional UI with:
- Gradient backgrounds
- Card-based layouts
- Smooth animations
- Responsive design
- Status badges and icons

## Future Enhancements

1. Real-time Firebase integration for live trip updates
2. Google Maps integration for route visualization
3. Driver mobile app
4. Advanced analytics and reporting
5. Push notifications

## License

MIT
