export default function RhLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="skeleton" style={{ width: 120, height: 12, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 280, height: 30, marginBottom: 26 }} />
      <div className="kpis" style={{ padding: 0 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kpi">
            <div className="skeleton" style={{ width: "60%", height: 12 }} />
            <div className="skeleton" style={{ width: "30%", height: 28, marginTop: 6 }} />
          </div>
        ))}
      </div>
      <div className="panel" style={{ height: 320 }}>
        <div className="skeleton" style={{ margin: 18, height: 16, width: "40%" }} />
        <div className="skeleton" style={{ margin: 18, height: 220 }} />
      </div>
    </div>
  );
}
