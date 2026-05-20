// ─────────────────────────────────────────────────────────────────────────────
// components/PageShell.jsx — Shared page layout wrapper
// Renders the sidebar navigation + a scrollable main content area.
// Every page wraps its content in <PageShell> so the sidebar is defined once.
// ─────────────────────────────────────────────────────────────────────────────

import { Link, useLocation } from "react-router-dom";
import "./PageShell.css";

// All navigation destinations — order controls sidebar display order
const NAV_ITEMS = [
  { label: "Dashboard",     to: "/"              },
  { label: "Drivers",       to: "/drivers"       },
  { label: "Vehicles",      to: "/vehicles"      },
  { label: "Registrations", to: "/registrations" },
  { label: "Violations",    to: "/violations"    },
  { label: "Reports",       to: "/reports"       },
];

// children — the page-specific content rendered inside the main area
export default function PageShell({ children }) {
  const location = useLocation();

  return (
    <div className="pageShell">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="pageSidebar">

        {/* Brand / logo area */}
        <div className="pageSidebarBrand">
          <div className="pageSidebarBrandTitle">LTO IMS</div>
          <div className="pageSidebarBrandSub">Information Management</div>
        </div>

        {/* Navigation links — active item is highlighted based on current path */}
        <nav className="pageSidebarNav">
          {NAV_ITEMS.map((item) => {
            // Mark as active when the path matches exactly, or starts with the
            // item's path (handles nested routes). "/" is excluded from prefix
            // matching so it only highlights on the root path itself.
            const active =
              location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));

            return (
              <Link
                key={item.label}
                to={item.to}
                className={`pageSidebarNavItem${active ? " pageSidebarNavItemActive" : ""}`}
              >
                <span>{item.label}</span>
                {active && <span className="pageSidebarNavChevron">›</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logged-in user info at the bottom of the sidebar */}
        <div className="pageSidebarFooter">
          <div className="pageSidebarAvatar">A</div>
          <div>
            <div className="pageSidebarUserName">Admin User</div>
            <div className="pageSidebarUserRole">Administrator</div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────── */}
      {/* Sidebar stays stable; only this route-specific content animates. */}
      <main className="pageMain">
        <div key={location.pathname} className="pageTransition">
          {children}
        </div>
      </main>

    </div>
  );
}