const fs = require("fs");
let data = fs.readFileSync("components/AdminApp.tsx", "utf8");
const oldText = `  const injectDefaults = (v) => {
    const newV = { ...v };
    if (!newV.annualFixedCosts || newV.annualFixedCosts.length === 0) {
      newV.annualFixedCosts = [
        { id: "1", name: "Vehicle Excise Duty (VED)", amount: 600 },
        { id: "2", name: "Annual Insurance", amount: 3200 },
        { id: "3", name: "Annual Depreciation", amount: 7975 }
      ];
    }
    return newV;
  };`;
const newText = `  const injectDefaults = (v) => {
    const newV = { ...v };
    if (!newV.annualFixedCosts || newV.annualFixedCosts.length === 0) {
      newV.annualFixedCosts = [
        { id: "1", name: "Vehicle Excise Duty (VED)", amount: 600 },
        { id: "2", name: "Annual Insurance", amount: 3200 },
        { id: "3", name: "Annual Depreciation", amount: 7975 }
      ];
    }
    
    // Always sync standingCostPerDay and ratePerKm with the parameters
    const fcSum = (newV.annualFixedCosts || []).reduce((s, x) => s + (Number(x.amount)||0), 0);
    const utilDays = newV.utilisationDays || 225;
    if (fcSum > 0) {
      newV.standingCostPerDay = fcSum / utilDays;
    }

    const vcSum = (newV.fuelCost||0) + (newV.tyreCost||0) + (newV.maintenanceCost||0) + (newV.miscVariableCost||0);
    if (vcSum > 0) {
      newV.ratePerKm = vcSum;
    }

    return newV;
  };`;
data = data.replace(oldText.replace(/"/g, "\x27"), newText.replace(/"/g, "\x27"));
fs.writeFileSync("components/AdminApp.tsx", data);
console.log(data.includes("Always sync standingCostPerDay") ? "SUCCESS" : "FAIL");
