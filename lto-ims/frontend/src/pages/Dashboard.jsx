import PageShell from "../components/PageShell";

export default function Dashboard() {
  return (
    <PageShell>
      <div className="headerRow">
        <div>
          <div className="pageTitle">Dashboard</div>
          <div className="pageSub">Overview and statistics</div>
        </div>
      </div>

      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}></div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>Coming Soon</div>
        <div style={{ fontSize: 13, color: "#86868B", marginTop: 6 }}>Dashboard is under construction.</div>
      </div>
    </PageShell>
  );
}
