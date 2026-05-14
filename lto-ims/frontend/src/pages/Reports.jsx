import PageShell from "../components/PageShell";

export default function Reports() {
  return (
    <PageShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1D1D1F" }}>Reports</div>
          <div style={{ fontSize: 13, color: "#86868B", marginTop: 4 }}>View statistics and generated reports</div>
        </div>
      </div>

      <div style={{
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgba(255,255,255,0.4)",
        borderRadius: 18,
        boxShadow: "0 14px 35px rgba(0,0,0,0.06)",
        padding: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        flex: 1,
      }}>
        <div style={{ fontSize: 40 }}></div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>Coming Soon</div>
        <div style={{ fontSize: 13, color: "#86868B" }}>Reports are under construction.</div>
      </div>
    </PageShell>
  );
}
