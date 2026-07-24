const fs = require('fs');
let data = fs.readFileSync('components/AdminApp.tsx', 'utf8');

const anchor = '<div>\n                      <label style={{ fontSize:11,fontWeight:700,color:PX.gray600,display:"block",marginBottom:4 }}>Driver Wage Weekday (£/hr)</label>';
const newFields = `<div>
                      <label style={{ fontSize:11,fontWeight:700,color:PX.gray600,display:"block",marginBottom:4 }}>Fuel Price (£/Litre)</label>
                      <input type="number" step="0.01" value={gv.fuelPricePerLitre ?? 1.52} onChange={e=>setGv(g=>({...g, fuelPricePerLitre: Number(e.target.value)}))}/>
                    </div>
                    `;

data = data.replace(anchor, newFields + anchor);
fs.writeFileSync('components/AdminApp.tsx', data);
