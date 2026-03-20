import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Dashboard from './components/JobBooking_Module/Dashboard';
import Vehicles from './components/VehicleManager_Module/Vehicles';
import Drivers from './components/DriverMonitor_Module/Drivers';
import BookJob from './components/JobBooking_Module/BookJob';
import Trips from './components/JobBooking_Module/Trips';
import TripRefusals from './components/JobBooking_Module/TripRefusals';
import PredictiveMaintenance from './components/PredictiveMaintenance_Module/PredictiveMaintenance';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './index.css';

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/book-job" element={<BookJob />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/refusals" element={<TripRefusals />} />
              <Route path="/predictive-maintenance" element={<PredictiveMaintenance />} />
            </Routes>
          </div>
        </div>
      </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
