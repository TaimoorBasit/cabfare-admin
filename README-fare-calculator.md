# Fare Calculator Documentation

## Purpose
The Fare Calculator provides accurate, live quotations for coach and minibus hire. It accounts for complex operational variables including "dead mileage" (the distance a vehicle travels empty from and to the depot), live mileage, driver hours, vehicle standing costs, operational overheads, toll surcharges, and seasonal demand. 

## Exact Formula(s) and Logic

The pricing engine (`server/pricingEngine.ts`) uses a **3-tier hierarchical logic system** to determine the base price before surcharges are applied.

### Priority 1: Route Templates (Fixed Price)
If a journey matches a pre-defined route template (matching pickup/drop-off names or within a specified GPS radius):
*   **Base Fare** = `template.price`
*   **Waiting Charge** = `(waitingMins / 60) * 20` (Fixed at £20/hr)
*   **Subtotal** = `Base Fare + Waiting Charge`

### Priority 2: Pricing Matrix (Distance + Matrix Rules)
If no template matches, it checks for an active Pricing Matrix rule:
*   **Base Fare** = `matrix.baseFare`
*   **Extra Live Charge** = `max(0, liveKm - matrix.includedLiveMileage) * matrix.extraMileageRate`
*   **Extra Dead Charge** = `max(0, deadKm - matrix.includedDeadMileage) * matrix.extraMileageRate`
*   **Waiting Charge** = `(waitingMins / 60) * matrix.waitingChargePerHour`
*   **Subtotal** = `Base Fare + Extra Live Charge + Extra Dead Charge + Waiting Charge`

### Priority 3: Fleet Economics Engine (Dynamic Variable Calculation)
If no template or matrix rule applies, the system builds the price from the ground up based on real operational costs:
*   **OpDays** = Total days of the trip (1 for same-day, else `ceil(returnDate - departureDate) + 1`)
*   **Shift Hours** = `(TotalKm / Speed) + (waitingMins / 60)` 
    *   *Speed Constant*: 48.5 mph or 78 km/h depending on global configuration unit.
*   **Driver Wages** = `(driverHourlyWage * Shift Hours * OpDays)`
    *   *Holiday Pay* = `Driver Wages * (holidayPayPct / 100)`
    *   *Dual Crew Multiplier* = If Shift Hours > 9 hours, multiply total driver wage by 2.
*   **Running Costs** = `(fuelPricePerLitre / fuelKpl) + tyreCostPerKm + maintenanceCostPerKm`
*   **Standing Costs** = `annualFixedCosts / utilisationDays` (per vehicle)
*   **Raw Subtotal** = `(Standing Costs * OpDays) + (Running Costs * TotalKm) + Driver Wages (inc. Holiday Pay)`
*   **Profit Margin** = `Raw Subtotal * (1 + profitMarginPct / 100)`
*   **Minimum Hire Rule**: Computes a minimum daily hire rate based on vehicle standing cost + company overheads. If `Final Price < (Min Hire * OpDays)`, the price is bumped up to the Minimum Hire value.

### Surcharges (Applied to all tiers)
After the base subtotal is calculated, conditional surcharges are added:
1.  **London ULEZ / CAZ**: Applied if any waypoint is within 35km of `51.5074, -0.1278` or contains "london". (Default: £12.50)
2.  **Birmingham CAZ**: Applied if any waypoint is within 10km of `52.4862, -1.8904` or contains "birmingham". (Default: £9.00)
3.  **Dartford Crossing**: Applied if any waypoint is within 15km of `51.4614, 0.2261` or contains "dartford". (Default: £2.50)
4.  **Driver Overnight Subsistence**: Applied if `OpDays > 1`. Cost is `driverOvernightSubsistence * (OpDays - 1)`. (Default: £55.00/night)

### Final Adjustments
*   **Extra Luggage Surcharge**: If luggage pieces > 16, a percentage multiplier is applied per extra bag.
    `Multiplier = 1 + ((Total Bags - 16) * extraLuggageProfitPct) / 100`
*   **Seasonal Multipliers**: Matches `departureDate` against configured seasonal periods.
    *   If `overrideFare` exists, it replaces the entire fare (excluding surcharges).
    *   If `multiplier` exists, the entire fare is multiplied by this factor (e.g., 1.2x for peak season).

## Where Constants / Rates are Defined

*   **Logic Engine**: `server/pricingEngine.ts`
*   **Database Definitions / Global Settings**: Configured via the Admin Panel and stored in the `db.json` pseudo-database (managed via `server/db.ts`).
    *   `globalVars`: Contains `fuelPricePerLitre`, `driverHourlyWage`, `holidayPayPct`, `profitMarginPct`, `yardAddress` (Depot location), `distanceUnit` (miles/km), and `extraLuggageProfitPct`.
    *   `vehicles`: Array containing per-vehicle `fuelKpl`, `tyreCostPerKm`, `maintenanceCostPerKm`, `annualCosts`, and `utilisationDays`. (Can override global vars).
    *   `annualOverheads`: Array of company-wide annual costs (used to calculate Minimum Hire).
    *   `surcharges`: Contains `ulez`, `birminghamCaz`, `dartford`, and `driverOvernightSubsistence`.

## Edge Cases Handled

*   **UK Only Restriction**: The application enforces that all waypoints are within the UK. The map picker fails explicitly if a selected location is outside the UK.
*   **Dual Driver Requirement**: Handled automatically. If the driving + waiting time exceeds 9 hours, the driver wage is multiplied by 2.
*   **API Failure Fallbacks**: If the backend Google Maps API fails to load or no API key is present, `mileageEngine.ts` defaults to hardcoded dummy mileage (100km live, 40km S).
*   **Minimum Fare Enforcement**: When using the Fleet Economics fallback, prices will never drop below the calculated `minHirePerDay`, ensuring no journey operates at a loss.
*   **Multi-day Trips**: Modifies the standing cost, driver wages, and automatically attaches nightly driver subsistence allowances.
