import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme.js';
import MainLayout from './layouts/MainLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Events from './pages/Events.jsx';
import EventDetails from './pages/EventDetails.jsx';
import LiveActivity from './pages/LiveActivity.jsx';
import ApprovalQueue from './pages/ApprovalQueue.jsx';
import AuditTrail from './pages/AuditTrail.jsx';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/activity" element={<LiveActivity />} />
            <Route path="/approvals" element={<ApprovalQueue />} />
            <Route path="/audit" element={<AuditTrail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
