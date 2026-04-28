import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import Dashboard from './components/JobBooking_Module/Dashboard';
import Vehicles from './components/VehicleManager_Module/Vehicles';
import Drivers from './components/DriverMonitor_Module/Drivers';
import BookJob from './components/JobBooking_Module/BookJob';
import Trips from './components/JobBooking_Module/Trips';
import TripRefusals from './components/JobBooking_Module/TripRefusals';
import PredictiveMaintenance from './components/PredictiveMaintenance_Module/PredictiveMaintenance';
import TripEconomics from './components/Economics_Module/TripEconomics';
import FuelConsistency from './components/Economics_Module/FuelConsistency';
import ProofOfDelivery from './components/ProofOfDelivery_Module/ProofOfDelivery';
import OrderTrackingPortal from './components/CustomerPortal_Module/OrderTrackingPortal';
import Login from './components/Login';
import PublicHeader from './components/PublicHeader';
import PublicFooter from './components/PublicFooter';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { isAuthenticated } from './auth/session';
import './index.css';

/** Admin shell: sidebar + header; requires login for all nested routes. */
function AdminLayout() {
    const location = useLocation();

    if (!isAuthenticated()) {
        if (location.pathname === '/') {
            return <Navigate to="/track" replace />;
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return (
        <div className="app-container">
            <Sidebar />
            <div className="main-content">
                <Header />
                <div className="page-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

function PublicTrackPage() {
    return (
        <div className="public-site">
            <PublicHeader />
            <main className="public-main">
                <OrderTrackingPortal />
            </main>
            <PublicFooter />
        </div>
    );
}

function WildcardRedirect() {
    return isAuthenticated() ? <Navigate to="/" replace /> : <Navigate to="/track" replace />;
}

function AppContent() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/track" element={<PublicTrackPage />} />
            <Route path="/" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="vehicles" element={<Vehicles />} />
                <Route path="drivers" element={<Drivers />} />
                <Route path="book-job" element={<BookJob />} />
                <Route path="trips" element={<Trips />} />
                <Route path="refusals" element={<TripRefusals />} />
                <Route path="predictive-maintenance" element={<PredictiveMaintenance />} />
                <Route path="economics" element={<TripEconomics />} />
                <Route path="fuel-consistency" element={<FuelConsistency />} />
                <Route path="proof-of-delivery" element={<ProofOfDelivery />} />
            </Route>
            <Route path="*" element={<WildcardRedirect />} />
        </Routes>
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
