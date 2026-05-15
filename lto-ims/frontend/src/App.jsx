import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./shared.css";

import Dashboard from "./pages/Dashboard";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import Registrations from "./pages/Registrations";
import Violations from "./pages/Violations";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/registrations" element={<Registrations />} />
        <Route path="/violations" element={<Violations />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/drivers" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
