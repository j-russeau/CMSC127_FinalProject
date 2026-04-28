import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={{ display: "flex", gap: "12px", padding: "12px", borderBottom: "1px solid #ddd" }}>
      <Link to="/drivers">Drivers</Link>
      <Link to="/vehicles">Vehicles</Link>
      <Link to="/registrations">Registrations</Link>
      <Link to="/violations">Violations</Link>
      <Link to="/reports">Reports</Link>
    </nav>
  );
}