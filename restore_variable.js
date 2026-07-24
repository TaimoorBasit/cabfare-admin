const fs = require('fs');
let data = fs.readFileSync('components/AdminApp.tsx', 'utf8');

const start = data.indexOf('{/* Variable Costs */}');
const end = data.indexOf('</details>', start) + 10;

const oldVariableCosts = `{/* Variable Costs */}
                      <details open style={{ background: "#fff", border: \`1.5px solid \${PX.gray200}\`, borderRadius: 8, padding: "12px 16px", marginBottom: "1rem" }}>
                        <summary style={{ cursor:"pointer",fontSize:13,fontWeight:700,color:PX.navy800, display: "flex", alignItems: "center", gap: 8 }}>▶ Variable Cost Parameters (Fuel, Tyres, Maintenance)</summary>
                        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginTop:10 }}>
                          <div>
                            <label style={{ fontSize:11,color:PX.gray600,fontWeight:700 }}>Fuel efficiency (kpl)</label>
                            <input type="number" step="0.1" value={v.fuelKpl ?? 5} onChange={e=>updateV(v.id,"fuelKpl",Number(e.target.value))} style={{ width: "100%", background: "#f9fafb", padding: "8px", border: \`1px solid \${PX.gray200}\`, borderRadius: 4 }} />
                          </div>
                          <div>
                            <label style={{ fontSize:11,color:PX.gray600,fontWeight:700 }}>Maintenance (£/km)</label>
                            <input type="number" step="0.01" value={v.maintenanceCostPerKm ?? 0.15} onChange={e=>updateV(v.id,"maintenanceCostPerKm",Number(e.target.value))} style={{ width: "100%", background: "#f9fafb", padding: "8px", border: \`1px solid \${PX.gray200}\`, borderRadius: 4 }} />
                          </div>
                          <div>
                            <label style={{ fontSize:11,color:PX.gray600,fontWeight:700 }}>Tyre cost (£/km)</label>
                            <input type="number" step="0.01" value={v.tyreCostPerKm ?? 0.05} onChange={e=>updateV(v.id,"tyreCostPerKm",Number(e.target.value))} style={{ width: "100%", background: "#f9fafb", padding: "8px", border: \`1px solid \${PX.gray200}\`, borderRadius: 4 }} />
                          </div>
                          <div>
                            <label style={{ fontSize:11,color:PX.gray600,fontWeight:700 }}>Extra profit per bag {">"} 16 (%)</label>
                            <input type="number" step="0.01" value={v.extraLuggageProfitPct ?? 0.2} onChange={e=>updateV(v.id,"extraLuggageProfitPct",Number(e.target.value))} style={{ width: "100%", background: "#f9fafb", padding: "8px", border: \`1px solid \${PX.gray200}\`, borderRadius: 4 }} />
                          </div>
                        </div>
                      </details>`;

data = data.substring(0, start) + oldVariableCosts + data.substring(end);
fs.writeFileSync('components/AdminApp.tsx', data);
