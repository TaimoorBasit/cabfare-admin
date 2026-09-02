
// @ts-nocheck
'use client';
import { API_BASE_URL } from '../lib/api';

import { Fragment, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import LeafletMapPickerModal from "./LeafletMapPickerModal";
import LeafletRouteMap from "./LeafletRouteMap";
import LeafletDepotMap from "./LeafletDepotMap";
import { Search, Sun, Moon, TrendingUp, Plus, Edit3, MoreVertical, Pause, History, CalendarDays, SlidersHorizontal, Download, CircleDollarSign, Target, RefreshCw, Activity, MapPinned, Eye, EyeOff } from "lucide-react";

const ADMIN_TOKEN_KEY = 'caroleanAdminToken';
const ADMIN_USER_KEY = 'caroleanAdminUser';
const ADMIN_DB_CACHE_KEY = 'caroleanAdminDbCache';

const RECOVERY_CONFIGURATION = {
  vehicles: {
    minibus: {
      capacity: 16, fleetCount: 2, utilisationDays: 225, fuelKpl: 9.5,
      ratePerKm: 0.26, sellingRateOneWay: 1.2, sellingRateReturn: 0.65, minimumHire: 175, includedKmOneWay: 20, includedKmReturn: 40, commercialWeight: 1, standingCostPerDay: 150,
      maintenanceCostPerKm: 0, maintenanceSetCost: 4800, expectedMaintenanceLifeKm: 60000, tyreSetCost: 1200, expectedTyreLifeKm: 60000,
      annualCosts: [
        { id: 1, label: 'Vehicle Excise Duty (VED)', cost: 600 },
        { id: 2, label: 'Annual Insurance', cost: 3200 },
        { id: 3, label: 'Annual Depreciation', cost: 7975 }
      ]
    },
    bus: {
      capacity: 33, fleetCount: 2, utilisationDays: 225, fuelKpl: 7.2,
      ratePerKm: 0.29, sellingRateOneWay: 1.65, sellingRateReturn: 0.85, minimumHire: 275, includedKmOneWay: 20, includedKmReturn: 50, commercialWeight: 1.08, standingCostPerDay: 200,
      maintenanceCostPerKm: 0, maintenanceSetCost: 9600, expectedMaintenanceLifeKm: 80000, tyreSetCost: 2800, expectedTyreLifeKm: 80000,
      annualCosts: [
        { id: 1, label: 'Vehicle Excise Duty (VED)', cost: 850 },
        { id: 2, label: 'Annual Insurance', cost: 5800 },
        { id: 3, label: 'Annual Depreciation', cost: 13220 }
      ]
    },
    coach: {
      capacity: 49, fleetCount: 1, utilisationDays: 260, fuelKpl: 3.6,
      maintenanceCostPerKm: 0, maintenanceSetCost: 22400, expectedMaintenanceLifeKm: 80000, tyreCostPerKm: 0.09, tyreSetCost: 2400,
      expectedTyreLifeKm: 80000, profitMarginPct: 30, fuelPricePerLitre: 1.52,
      ratePerKm: 0.79, sellingRateOneWay: 2.2, sellingRateReturn: 1, minimumHire: 450, includedKmOneWay: 0, includedKmReturn: 75, commercialWeight: 1.12, standingCostPerDay: 260,
      annualCosts: [
        { id: 1, label: 'Vehicle Excise Duty (VED)', cost: 1650 },
        { id: 2, label: 'Annual Insurance', cost: 7800 },
        { id: 3, label: 'Annual Depreciation', cost: 16500 }
      ]
    }
  },
  globalVars: {
    fuelPricePerLitre: 1.52, driverHourlyWage: 18, holidayPayPct: 12.07,
    profitMarginPct: 20, driverWageWeekday: 15, driverWageWeekend: 20,
    driverWageHoliday: 22, marginWeekday: 20, marginWeekend: 25,
    marginHoliday: 30, netMarginPct: 5, netProfitTarget: 0, overnightCost: 200, waitingChargePerHour: 35,
    emptyLegThresholdKm: 20, dualDriverThresholdHours: 9,
    waitingWageFactor: 0.75, customerRangePct: 12, walkaroundCheckMinutes: 30,
    distanceUnit: 'miles',
    yardAddress: 'Unit 1, Carolean Coaches, Bentley Lane, Walsall WS2 8TL, UK',
    yardLat: 52.5916536, yardLng: -2.0071041
  },
  surcharges: { m6Toll: 9.5, dartford: 2.5, ulez: 12.5, birminghamCaz: 8, driverOvernightSubsistence: 60 },
  annualOverheads: [
    { id: 1, label: 'Office & Premises', cost: 18000 },
    { id: 2, label: 'Administration & Staffing', cost: 14400 },
    { id: 3, label: 'Accountancy & Legal', cost: 5200 },
    { id: 4, label: 'IT & Communication', cost: 2400 },
    { id: 5, label: 'Marketing', cost: 3600 },
    { id: 6, label: 'Fleet Operator Licence', cost: 1800 },
    { id: 7, label: 'Miscellaneous', cost: 4600 }
  ],
  operatorDetails: {
    companyName: 'Carolean Coaches Ltd', operatorLicence: 'PM0003456',
    depotPostcode: 'WS2 8TL', notificationEmail: 'bookings@caroleancoaches.co.uk'
  }
};

function restoreMissingConfiguration(source) {
  const data = structuredClone(source || {});
  let changed = false;
  const missingPositive = value => !Number.isFinite(Number(value)) || Number(value) <= 0;
  const missingNonNegative = value => !Number.isFinite(Number(value)) || Number(value) < 0;

  data.vehicles = Array.isArray(data.vehicles) ? data.vehicles.map(vehicle => {
    const baseline = RECOVERY_CONFIGURATION.vehicles[vehicle.id];
    if (!baseline) return vehicle;
    const repaired = { ...vehicle };
    if (repaired.name === 'Executive Minibus') repaired.name = 'Minibus';
    for (const [field, value] of Object.entries(baseline)) {
      if (field === 'annualCosts') continue;
      const requiresPositive = ['capacity', 'fleetCount', 'utilisationDays', 'fuelKpl', 'expectedTyreLifeKm', 'ratePerKm', 'commercialWeight'].includes(field);
      if ((requiresPositive ? missingPositive(repaired[field]) : missingNonNegative(repaired[field]))) {
        repaired[field] = value;
        changed = true;
      }
    }
    const currentCosts = Array.isArray(repaired.annualFixedCosts) && repaired.annualFixedCosts.length
      ? repaired.annualFixedCosts : repaired.annualCosts;
    const costsAreMissing = !Array.isArray(currentCosts);
    if (costsAreMissing) {
      repaired.annualCosts = structuredClone(baseline.annualCosts);
      repaired.annualFixedCosts = baseline.annualCosts.map(cost => ({ ...cost, name: cost.label, amount: cost.cost }));
      changed = true;
    }
    return repaired;
  }) : [];

  data.globalVars = { ...(data.globalVars || {}) };
  for (const [field, value] of Object.entries(RECOVERY_CONFIGURATION.globalVars)) {
    const current = data.globalVars[field];
    const isMissing = typeof value === 'number' ? !Number.isFinite(Number(current)) : !String(current || '').trim();
    if (isMissing) { data.globalVars[field] = value; changed = true; }
  }
  if (Number(data.globalVars.netMarginPct) < 5) {
    data.globalVars.netMarginPct = 5;
    changed = true;
  }
  if (Number(data.globalVars.dualDriverThresholdHours) <= 0 || Number(data.globalVars.dualDriverThresholdHours) > 9) {
    data.globalVars.dualDriverThresholdHours = 9;
    changed = true;
  }
  if (!String(data.globalVars.yardAddress || '').toLowerCase().includes('bentley lane')) {
    data.globalVars.yardAddress = RECOVERY_CONFIGURATION.globalVars.yardAddress;
    data.globalVars.yardLat = RECOVERY_CONFIGURATION.globalVars.yardLat;
    data.globalVars.yardLng = RECOVERY_CONFIGURATION.globalVars.yardLng;
    changed = true;
  }

  data.surcharges = { ...(data.surcharges || {}) };
  for (const [field, value] of Object.entries(RECOVERY_CONFIGURATION.surcharges)) {
    if (missingNonNegative(data.surcharges[field])) { data.surcharges[field] = value; changed = true; }
  }
  if (!Array.isArray(data.annualOverheads)) {
    data.annualOverheads = structuredClone(RECOVERY_CONFIGURATION.annualOverheads);
    changed = true;
  }
  data.operatorDetails = { ...(data.operatorDetails || {}) };
  for (const [field, value] of Object.entries(RECOVERY_CONFIGURATION.operatorDetails)) {
    if (!String(data.operatorDetails[field] || '').trim()) { data.operatorDetails[field] = value; changed = true; }
  }
  return { data, changed };
}
const authenticatedFetch = (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
};

function LegacyAdminAuthGate({ onAuthenticated }) {
  const accessParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const accessMode = accessParams?.get('access');
  const accessToken = accessParams?.get('token') || '';
  const [mode, setMode] = useState(accessToken && ['invite', 'reset'].includes(accessMode) ? accessMode : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const errorTimerRef = useRef(null);

  useEffect(() => () => {
    if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
  }, []);

  const clearAuthError = () => {
    if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
    errorTimerRef.current = null;
    setError('');
  };

  const showConfirmedAuthError = message => {
    clearAuthError();
    errorTimerRef.current = window.setTimeout(() => {
      setError(message || 'Authentication failed');
      errorTimerRef.current = null;
    }, 400);
  };

  const isCreatePasswordMode = mode === 'register' || mode === 'invite' || mode === 'reset';

  const submit = async event => {
    event.preventDefault();
    clearAuthError();

    if (isCreatePasswordMode && password !== confirmPassword) {
      showConfirmedAuthError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const accessSetup = mode === 'invite' || mode === 'reset';
      const endpoint = accessSetup ? (mode === 'invite' ? 'complete-invite' : 'reset-password') : mode;
      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessSetup ? { token: accessToken, password } : { name, email, password })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Authentication failed');
      if (mode === 'register' || accessSetup) {
        if (accessSetup) window.history.replaceState({}, '', window.location.pathname);
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setError(accessSetup ? 'Password saved. Sign in to continue.' : 'Administrator created. Sign in to continue.');
      } else {
        clearAuthError();
        window.localStorage.setItem(ADMIN_TOKEN_KEY, payload.token);
        if (payload.user) window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(payload.user));
        onAuthenticated(payload.user || null);
      }
    } catch (authError) {
      showConfirmedAuthError(authError.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const accessSetup = mode === 'invite' || mode === 'reset';
  return (
    <main className="admin-auth-screen min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="admin-auth-card w-full max-w-sm rounded-2xl p-7">
        <img src="/carolean%20image.png" alt="Carolean" className="h-14 mx-auto mb-5"/>
        <h1 className="text-xl font-extrabold text-slate-900 text-center">{mode === 'login' ? 'Admin sign in' : 'Create first administrator'}</h1>
        <p className="text-sm text-slate-600 text-center mt-1 mb-5">Protected access to pricing and operational data.</p>
        {mode === 'register' && (
          <label className="block text-xs font-bold text-slate-700 mb-3">Name
            <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-900" value={name} onChange={event=>setName(event.target.value)} required/>
          </label>
        )}
        <label className="block text-xs font-bold text-slate-700 mb-3">Email
          <input type="email" className="mt-1 w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-900" value={email} onChange={event=>setEmail(event.target.value)} required/>
        </label>
        <label className="block text-xs font-bold text-slate-700 mb-3">
          Password
          <div className="relative mt-1">
            <input type={showPassword ? 'text' : 'password'} minLength={10} className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 pr-10 text-sm text-slate-900" value={password} onChange={event=>setPassword(event.target.value)} required/>
            <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {isCreatePasswordMode && (
          <label className="block text-xs font-bold text-slate-700 mb-3">
            Confirm password
            <div className="relative mt-1">
              <input type={showConfirmPassword ? 'text' : 'password'} minLength={10} className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 pr-10 text-sm text-slate-900" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} required/>
              <button type="button" onClick={()=>setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
        )}
        {error && <p className={`mb-3 text-xs ${error.startsWith('Administrator created') ? 'text-emerald-700' : 'text-red-700'}`}>{error}</p>}
        <button disabled={busy} className="admin-auth-submit w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create administrator'}</button>
      </form>
    </main>
  );
}

// ── Design tokens ─────────────────────────────────────────────────────────────
function AdminAuthGate({ onAuthenticated }) {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const access = params?.get('access');
  const token = params?.get('token') || '';
  const [mode, setMode] = useState(token && ['invite', 'reset'].includes(access) ? access : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const accessSetup = mode === 'invite' || mode === 'reset';
  const isCreatePasswordMode = mode === 'register' || accessSetup;

  const submit = async event => {
    event.preventDefault();
    setMessage('');

    if (isCreatePasswordMode && password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const endpoint = accessSetup ? (mode === 'invite' ? 'complete-invite' : 'reset-password') : mode;
      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(accessSetup ? {token,password} : {name,email,password}) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Authentication failed');
      if (mode === 'register' || accessSetup) {
        if (accessSetup) window.history.replaceState({}, '', window.location.pathname);
        setMode('login'); setPassword(''); setConfirmPassword(''); setMessage('Password saved. Sign in to continue.');
      } else {
        window.localStorage.setItem(ADMIN_TOKEN_KEY, payload.token);
        if (payload.user) window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(payload.user));
        onAuthenticated(payload.user || null);
      }
    } catch (error) { setMessage(error.message || 'Authentication failed'); }
    finally { setBusy(false); }
  };

  const title = accessSetup ? (mode === 'invite' ? 'Set up your account' : 'Create a new password') : mode === 'login' ? 'Admin sign in' : 'Create first administrator';
  return (
    <main className="admin-auth-screen min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="admin-auth-card w-full max-w-sm rounded-2xl p-7">
        <img src="/carolean%20image.png" alt="Carolean" className="h-14 mx-auto mb-5"/>
        <h1 className="text-xl font-extrabold text-slate-900 text-center">{title}</h1>
        <p className="text-sm text-slate-600 text-center mt-1 mb-5">{accessSetup ? 'Choose a secure password with at least 10 characters.' : 'Protected access to pricing and operational data.'}</p>
        {mode === 'register' && (
          <label className="block text-xs font-bold text-slate-700 mb-3">Name
            <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-900" value={name} onChange={event=>setName(event.target.value)} required/>
          </label>
        )}
        {!accessSetup && (
          <label className="block text-xs font-bold text-slate-700 mb-3">Email
            <input type="email" className="mt-1 w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-900" value={email} onChange={event=>setEmail(event.target.value)} required/>
          </label>
        )}
        <label className="block text-xs font-bold text-slate-700 mb-3">
          {accessSetup ? 'New password' : 'Password'}
          <div className="relative mt-1">
            <input type={showPassword ? 'text' : 'password'} minLength={10} className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 pr-10 text-sm text-slate-900" value={password} onChange={event=>setPassword(event.target.value)} required/>
            <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {isCreatePasswordMode && (
          <label className="block text-xs font-bold text-slate-700 mb-3">
            {accessSetup ? 'Confirm new password' : 'Confirm password'}
            <div className="relative mt-1">
              <input type={showConfirmPassword ? 'text' : 'password'} minLength={10} className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 pr-10 text-sm text-slate-900" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} required/>
              <button type="button" onClick={()=>setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
        )}
        {message && <p className={`mb-3 text-xs ${message.includes('Sign in to continue') ? 'text-emerald-700' : 'text-red-700'}`}>{message}</p>}
        <button disabled={busy} className="admin-auth-submit w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Please wait…' : accessSetup ? 'Save password' : mode === 'login' ? 'Sign in' : 'Create administrator'}</button>
      </form>
    </main>
  );
}

const PX = {
  navy800: "#0D0E48",       // Primary Navy Blue from website
  navy700: "#13155C",       // Dark Accent
  navy600: "#1E228E",       // Medium Navy
  brandRed: "#CD202C",      // Primary Brand Red from website
  brandRedHover: "#b01c26", // Hover state for primary buttons
  amber500: "#A22D3A",      // Restrained Carolean accent
  amber400: "#C2646E",
  amber100: "#F2E4E6",
  teal700: "#0c6e55",
  teal100: "#e0f5ef",
  red700: "#b91c1c",
  red100: "#fee2e2",
  gray50: "#f8fafc",        // Light slate backgrounds
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray400: "#94a3b8",
  gray600: "#475569",
  gray900: "#0f172a",
  offWhite: "#f4f5f7",
};

// ── Inline Vector SVG Components (Replacing Emojis) ───────────────────────────
function SvgMapPinGreen({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" fill="#22c55e" />
    </svg>
  );
}

function SvgGrid({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function SvgMapPinRed({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#CD202C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" fill="#CD202C" />
    </svg>
  );
}

function SvgMap({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

function SvgDepot({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 21V9h6v12" />
    </svg>
  );
}

function SvgUser({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SvgBus({ size = 28, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="4" y="3" width="16" height="14" rx="2" />
      <path d="M7 10h2v3H7z" />
      <path d="M15 10h2v3h-2z" />
      <path d="M4 14h16" />
      <circle cx="8" cy="19" r="1.5" fill="currentColor" />
      <circle cx="16" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

// ── Minibus drawing ──
function SvgMinibus({ size = 28, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M3 11h18" />
      <path d="M8 5v6" />
      <path d="M16 5v6" />
      <circle cx="7" cy="18" r="1.5" fill="currentColor" />
      <circle cx="17" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

// ── Coach drawing ──
function SvgCoach({ size = 28, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="2" y="3" width="20" height="15" rx="3" />
      <path d="M2 8h20" />
      <path d="M2 13h20" />
      <circle cx="6" cy="21" r="2" fill="currentColor" />
      <circle cx="18" cy="21" r="2" fill="currentColor" />
      <path d="M9 21h6" />
    </svg>
  );
}

function SvgSettings({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SvgBookings({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function SvgPricing({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function SvgTrash({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function SvgClose({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const ROAD_CHARGE_DEFAULTS = [
  { key: "ulez", label: "London ULEZ", color: "#10B981" },
  { key: "birminghamCaz", label: "Bham CAZ", color: "#60A5FA" },
  { key: "dartford", label: "Dartford", color: "#A22D3A" },
  { key: "m6Toll", label: "M6 Toll", color: "#F43F5E" }
];

const ROAD_CHARGE_DEFAULT_KEYS = new Set(ROAD_CHARGE_DEFAULTS.map(item => item.key));

const QUICK_ACCESS_FEATURES = [
  { key: 'seasonal', label: 'Seasonal', tab: 'pricing', target: 'pricing-seasonal' },
  { key: 'fleetVariables', label: 'Fleet variables', tab: 'fleet', target: 'fleet-variables' },
  { key: 'quotations', label: 'Quotations', tab: 'bookings', target: 'quotation-workspace' },
  { key: 'matrix', label: 'Pricing matrix', tab: 'pricing', target: 'pricing-matrix' },
  { key: 'routes', label: 'Fixed routes', tab: 'pricing', target: 'pricing-routes' },
  { key: 'fixedCosts', label: 'Fixed costs', tab: 'fleet', target: 'fleet-fixed-costs' },
];

const ADMIN_SEARCH_DESTINATIONS = [
  { label: 'Executive dashboard', description: 'Revenue, activity and fleet overview', tab: 'dashboard', keywords: 'home metrics revenue activity overview' },
  { label: 'Seasonal multipliers', description: 'Time-based pricing rules', tab: 'pricing', target: 'pricing-seasonal', feature: 'seasonal', keywords: 'season holiday multiplier pricing' },
  { label: 'Dynamic pricing matrix', description: 'Global, fleet and city rates', tab: 'pricing', target: 'pricing-matrix', feature: 'matrix', keywords: 'matrix bands rates city global' },
  { label: 'Fixed route templates', description: 'Saved route prices', tab: 'pricing', target: 'pricing-routes', feature: 'routes', keywords: 'route template fixed price' },
  { label: 'Fleet variables', description: 'Count, utilisation, seats and running costs', tab: 'fleet', target: 'fleet-variables', feature: 'fleetVariables', keywords: 'fleet fuel tyre maintenance luggage seats utilisation' },
  { label: 'Vehicle Overheads', description: 'Vehicle standing-cost ledger', tab: 'fleet', target: 'fleet-fixed-costs', feature: 'fixedCosts', keywords: 'annual fixed cost vehicle overheads insurance depreciation standing' },
  { label: 'Quotations', description: 'Search, edit and export quotes', tab: 'bookings', target: 'quotation-workspace', feature: 'quotations', keywords: 'quote booking client customer export' },
  { label: 'Company settings', description: 'Business and operator details', tab: 'settings', settingsSection: 'company', keywords: 'company operator business licence' },
  { label: 'Pricing settings', description: 'Wages, margins and operating rates', tab: 'settings', settingsSection: 'pricing', keywords: 'wage margin waiting overnight pricing' },
  { label: 'Surcharges', description: 'Road charges and additional fees', tab: 'settings', settingsSection: 'pricing', keywords: 'ulez caz dartford m6 toll surcharge' },
  { label: 'Overheads', description: 'Annual business overheads', tab: 'settings', settingsSection: 'pricing', target: 'settings-overheads', keywords: 'overhead annual company cost' },
  { label: 'Staff access', description: 'Invitations, permissions and activity', tab: 'settings', settingsSection: 'staff', keywords: 'staff member invite role permission password activity usage' },
  { label: 'Availability', description: 'Blocked dates and unavailable units', tab: 'pricing', target: 'pricing-availability', keywords: 'availability blocked dates vehicle units' },
];

function humanizeChargeKey(key) {
  return String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase()) || "Custom charge";
}

function buildRoadChargeItems(surcharges = {}) {
  const defaults = ROAD_CHARGE_DEFAULTS.map(item => ({
    ...item,
    amount: Number(surcharges?.[item.key] ?? 0),
    locked: true
  }));
  const extras = Object.entries(surcharges)
    .filter(([key]) => !ROAD_CHARGE_DEFAULT_KEYS.has(key))
    .map(([key, value]) => ({
      key,
      label: humanizeChargeKey(key),
      color: "#64748B",
      amount: Number(value ?? 0),
      locked: false
    }));
  return [...defaults, ...extras];
}

function roadChargeItemsToMap(items) {
  return items.reduce((accumulator, item) => {
    accumulator[item.key] = Number(item.amount ?? 0);
    return accumulator;
  }, {});
}

function makeRoadChargeKey(label, existingKeys) {
  const baseKey = String(label || "custom charge")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "custom_charge";
  let nextKey = baseKey;
  let index = 2;
  while (existingKeys.has(nextKey)) {
    nextKey = `${baseKey}_${index}`;
    index += 1;
  }
  return nextKey;
}

// ── Global CSS & Montserrat Font loading ───────────────────────────────────────
function GlobalStyle() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Outfit:wght@100..900&display=swap');

      /* ── Animations ── */
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      .fade-up { animation: fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
      .spinning { animation: spin 1s linear infinite; display: inline-block; }

      /* ── Google Places autocomplete ── */
      .pac-container {
        border-radius: 12px !important;
        border: 1px solid #dde0e8 !important;
        box-shadow: 0 8px 24px rgba(13, 14, 72, 0.06) !important;
        font-family: 'Figtree', sans-serif !important;
        margin-top: 4px !important;
        z-index: 99999 !important;
        padding: 6px 0 !important;
      }
      .dark .pac-container {
        background-color: #1f2937 !important;
        border-color: #374151 !important;
      }
      .dark .pac-item { color: #d1d5db !important; }
      .dark .pac-item-query { color: #f3f4f6 !important; }
      .dark .pac-item:hover { background-color: #374151 !important; }

      .pac-item { padding: 10px 14px !important; font-size: 13px !important; cursor: pointer; display: flex; align-items: center; gap: 8px; }
      .pac-item:hover { background: #f8fafc !important; }
      .pac-item-query { font-size: 13.5px !important; color: #0f172a !important; font-weight: 500 !important; }
      .pac-icon { display: none !important; }
      .pac-matched { color: #CD202C !important; font-weight: 700 !important; }

      /* ── Scrollbar ── */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
      ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      
      .dark ::-webkit-scrollbar-thumb { background: #475569; }
      .dark ::-webkit-scrollbar-thumb:hover { background: #64748b; }
      
      /* Ensure no border overrides on inputs from legacy code */
    `;
    document.head.appendChild(el);
    return () => {
      document.head.removeChild(el);
    };
  }, []);
  return null;
}

// ── Google Maps loader ────────────────────────────────────────────────────────
function useGoogleMaps(apiKey) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!apiKey?.trim()) return;
    if (window.google?.maps?.places) { setLoaded(true); return; }
    window.gm_authFailure = () => setLoaded(false);
    const existing = document.getElementById("gm-script");
    if (existing) { existing.onload = () => setLoaded(Boolean(window.google?.maps?.places)); return; }
    const s = document.createElement("script");
    s.id = "gm-script";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey.trim()}&libraries=places,geometry`;
    s.async = true; s.defer = true;
    s.onload = () => setLoaded(Boolean(window.google?.maps?.places));
    s.onerror = () => setLoaded(false);
    document.head.appendChild(s);
    return () => { delete window.gm_authFailure; };
  }, [apiKey]);
  return loaded;
}

// ── Map Picker Modal (Street Map Style via Leaflet) ───────────────────────────
function MapPickerModal(props) {
  return <LeafletMapPickerModal {...props} />;
}

// ── Places Autocomplete Input ─────────────────────────────────────────────────
function PlacesInput({ value, onChange, placeholder, icon, mapsLoaded, onIconClick }) {
  const inputRef = useRef(null);
  const acRef = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localVal, setLocalVal] = useState(value || "");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalVal(value || "");
  }, [value]);

  useEffect(() => {
    if (!mapsLoaded || !inputRef.current || acRef.current) return;
    let listener;
    try {
      acRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "gb" },
        fields: ["formatted_address", "geometry", "name"],
      });
      listener = acRef.current.addListener("place_changed", () => {
        const p = acRef.current.getPlace();
        let addr = p.formatted_address || "";
        if (p.name && !addr.toLowerCase().includes(p.name.toLowerCase())) {
          addr = p.name + (addr ? ", " + addr : "");
        }
        if (!addr) addr = p.name || "";
        const lat = p.geometry?.location?.lat();
        const lng = p.geometry?.location?.lng();
        setLocalVal(addr);
        onChange(addr, lat && lng ? { lat, lng, name: addr } : null);
      });
    } catch (_) {}

    return () => {
      if (listener) {
        window.google?.maps?.event?.removeListener(listener);
      }
      if (window.google?.maps?.event?.clearInstanceListeners && acRef.current) {
        window.google.maps.event.clearInstanceListeners(acRef.current);
      }
      acRef.current = null;
    };
  }, [mapsLoaded]);

  const handleTextChange = (val) => {
    setLocalVal(val);
    onChange(val, null);
  };

  const handleBlur = () => {
    if (localVal !== value) {
      onChange(localVal, null);
    }
  };

  return (
    <div className="places-input" style={{ position:"relative", width: "100%" }}>
      <button className="places-input-icon" aria-label="Choose location on map" type="button" onClick={()=>{ if (onIconClick) onIconClick(); else setPickerOpen(true); }} title="Choose or search on map"
        style={{ position:"absolute", left:6, top:"50%", transform:"translateY(-50%)",
          display:"flex", alignItems:"center", zIndex:1, background:"none", border:"none", cursor:"pointer", opacity:1,
          padding:"6px", borderRadius:6, transition:"background .15s" }}
        onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="none"}>
        {icon}
      </button>
      <input ref={inputRef} type="text" placeholder={placeholder} value={localVal}
        style={{ paddingLeft:38, paddingRight: 12 }} 
        onChange={e => handleTextChange(e.target.value)}
        onBlur={handleBlur}
      />
      {mounted && typeof document !== 'undefined' ? createPortal(
        <MapPickerModal isOpen={pickerOpen} onClose={()=>setPickerOpen(false)} 
          initialSearch={localVal} onConfirm={(addr, geo)=>{ setLocalVal(addr); onChange(addr, geo); setPickerOpen(false); }} />,
        document.body
      ) : null}
    </div>
  );
}

// ── UK Cities fallback geocoder ───────────────────────────────────────────────
const UK_CITIES = {
  "walsall":[52.5863,-1.9817],"london":[51.5074,-0.1278],"birmingham":[52.4862,-1.8904],
  "manchester":[53.4808,-2.2426],"liverpool":[53.4084,-2.9916],"leeds":[53.8008,-1.5491],
  "sheffield":[53.3811,-1.4701],"bristol":[51.4545,-2.5879],"edinburgh":[55.9533,-3.1883],
  "glasgow":[55.8642,-4.2518],"cardiff":[51.4816,-3.1791],"nottingham":[52.9548,-1.1581],
  "leicester":[52.6369,-1.1398],"coventry":[52.4068,-1.5197],"derby":[52.9225,-1.4746],
  "newcastle":[54.9783,-1.6178],"oxford":[51.7520,-1.2577],"cambridge":[52.2053,0.1218],
  "brighton":[50.8225,-0.1372],"portsmouth":[50.8198,-1.0880],"southampton":[50.9097,-1.4044],
  "exeter":[50.7184,-3.5339],"plymouth":[50.3755,-4.1427],"norwich":[52.6309,1.2974],
  "wolverhampton":[52.5870,-2.1288],"stoke":[53.0027,-2.1794],"chester":[53.1905,-2.8910],
  "york":[53.9590,-1.0815],"bath":[51.3758,-2.3599],"luton":[51.8787,-0.4200],
  "reading":[51.4543,-0.9781],"blackpool":[53.8175,-3.0357],"bradford":[53.7960,-1.7594],
  "hull":[53.7676,-0.3274],"swindon":[51.5558,-1.7797],"northampton":[52.2405,-0.9027],
  "milton keynes":[52.0406,-0.7594],"worcester":[52.1920,-2.2200],"gloucester":[51.8642,-2.2380],
};
const YARD_GEO = { lat:52.5863, lng:-1.9817, name:"Walsall Yard (Base)" };
// ── Default database ──────────────────────────────────────────────────────────

function Btn({ children, onClick, variant="primary", size="md", disabled, full, style:sx={} }) {
  const v = {
    primary: {background:PX.brandRed,  color:"#fff", border:"none"},
    amber:   {background:PX.amber500,  color:"#fff", border:"none"},
    ghost:   {background:"transparent",color: PX.navy800, border:`1px solid ${PX.gray300}`},
    teal:    {background:PX.teal700,   color:"#fff", border:"none"},
    danger:  {background:PX.red700,    color:"#fff", border:"none"},
  };
  const pad = size==="sm" ? "7px 16px" : size==="lg" ? "12px 28px" : "9px 20px";
  const fs  = size==="sm" ? 14 : size==="lg" ? 16.5 : 15;
  return (
    <button onClick={!disabled?onClick:undefined} disabled={disabled}
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
        cursor:disabled?"not-allowed":"pointer", fontWeight:700, borderRadius:6,
        transition:"all .2s cubic-bezier(0.4, 0, 0.2, 1)", letterSpacing:.3, opacity:disabled?.55:1,
        padding:pad, fontSize:fs, width:full?"100%":"auto",
        boxShadow: variant==="primary" && !disabled ? "0 4px 12px rgba(205,32,44,0.18)" :
                   variant==="teal"    && !disabled ? "0 4px 12px rgba(12,110,85,0.15)" : "none",
        ...v[variant], ...sx }}
      onMouseEnter={e=>{ if(!disabled){ e.currentTarget.style.opacity=".9"; e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow = variant==="primary" ? "0 6px 16px rgba(205,32,44,0.24)" : variant==="teal" ? "0 6px 16px rgba(12,110,85,0.22)" : "none"; } }}
      onMouseLeave={e=>{ if(!disabled){ e.currentTarget.style.opacity="1";   e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow = variant==="primary" ? "0 4px 12px rgba(205,32,44,0.18)" : variant==="teal" ? "0 4px 12px rgba(12,110,85,0.15)" : "none"; } }}>
      {children}
    </button>
  );
}

function fmt(n)  { return Number(n).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtK(n) { return "£"+Number(n).toLocaleString("en-GB"); }

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }) {
  return <div style={{ height:6, background:PX.gray200, borderRadius:10, overflow:"hidden" }}>
    <div style={{ width:`${Math.min(100,pct)}%`, height:"100%", background:color, borderRadius:10, transition:"width .4s" }}/>
  </div>;
}

// ── Route map ─────────────────────────────────────────────────────────────────

function DepotMapPreview({ lat, lng, darkMode }) {
  return <LeafletDepotMap lat={lat} lng={lng} darkMode={darkMode} />;
}

const googleMapDarkStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7B8491" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#A8B0BC" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#929CAA" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#465363" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#D1D6DD" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#929CAA" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

function normaliseRoutePoint(point) {
  if (!point) return null;
  const source = point.location || point;
  const rawLat = typeof source.lat === "function" ? source.lat() : source.lat;
  const rawLng = typeof source.lng === "function" ? source.lng() : source.lng;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // Older imported quotations used 0,0 when coordinates were not available.
  // It is not a valid UK journey point and must never influence map bounds.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng, name: point.name || point.address || "" };
}

function getJourneyStops(journey) {
  if (!journey?.stops) return [];
  return (Array.isArray(journey.stops) ? journey.stops : [journey.stops]).filter(stop => stop?.place || stop?.name || stop?.coords);
}

function getSavedRoutePoints(result, journey) {
  const explicitPoints = (result?.pts || []).map(normaliseRoutePoint).filter(Boolean);
  const legs = Array.isArray(result?.chain) ? result.chain : [];
  const recoveredPoints = [];
  if (legs.length) {
    const start = normaliseRoutePoint(legs[0]?.start_location);
    if (start) recoveredPoints.push({ ...start, name: legs[0]?.start_address || start.name });
    legs.forEach(leg => {
      const end = normaliseRoutePoint(leg?.end_location);
      if (end) recoveredPoints.push({ ...end, name: leg?.end_address || end.name });
    });
  }
  const journeyCoordinates = (journey?.wpCoords || []).map(normaliseRoutePoint).filter(Boolean);
  const stopPoints = getJourneyStops(journey).map(stop => {
    const point = normaliseRoutePoint(stop?.coords || stop);
    return point ? { ...point, name: stop.place || stop.name || point.name, kind: "stop", wait: stop.wait } : null;
  }).filter(Boolean);

  const sourcePoints = explicitPoints.length >= 2 ? explicitPoints : recoveredPoints.length >= 2 ? recoveredPoints : journeyCoordinates;
  const origin = sourcePoints[0] || journeyCoordinates[0] || null;
  const destination = sourcePoints[sourcePoints.length - 1] || journeyCoordinates[journeyCoordinates.length - 1] || null;
  const middle = stopPoints.length ? stopPoints : sourcePoints.slice(1, -1);
  const points = [origin && { ...origin, name: journey?.origin || origin.name, kind: "origin" }, ...middle, destination && { ...destination, name: journey?.destination || destination.name, kind: "destination" }].filter(Boolean);
  return points.filter((point, index, allPoints) => index === 0 || point.lat !== allPoints[index - 1].lat || point.lng !== allPoints[index - 1].lng);
}

function GoogleMapPreview(props) {
  return <LeafletRouteMap {...props} />;
}

function RouteMap({ result, journey, gv, height=320, minimal=false, darkMode=false, mapsLoaded=false }) {
  const savedRoutePoints = getSavedRoutePoints(result, journey);
  if (result?.geometry || savedRoutePoints.length >= 2) {
    return <GoogleMapPreview result={result} journey={journey} gv={gv} height={height} minimal={minimal} darkMode={darkMode} />;
  }
  if (savedRoutePoints.length < 2) return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height, gap:10, color: PX.gray400, border: minimal ? 'none' : `1.5px dashed ${darkMode ? "#374151" : PX.gray200}`, borderRadius: minimal ? 0 : 12 }}>
      <SvgMap size={36} color={PX.gray400} />
      <p style={{ fontSize:15, fontWeight:600, textAlign:"center", padding:"0 18px" }}>{journey?.origin && journey?.destination ? "Route preview was not saved for this quotation." : "Pickup and drop-off locations are required for a route preview."}</p>
    </div>;

  const W=370, H=310, PAD=32;
  const pts = savedRoutePoints;
  const configuredDepot = gv?.yardLat != null && gv?.yardLat !== "" && Number.isFinite(Number(gv?.yardLat)) && gv?.yardLng != null && gv?.yardLng !== "" && Number.isFinite(Number(gv?.yardLng))
    ? { lat:Number(gv.yardLat), lng:Number(gv.yardLng) }
    : null;
  const all = configuredDepot ? [configuredDepot, ...pts] : pts;
  const lats=all.map(p=>p.lat), lngs=all.map(p=>p.lng);
  const minLat=Math.min(...lats)-.9, maxLat=Math.max(...lats)+.9;
  const minLng=Math.min(...lngs)-.9, maxLng=Math.max(...lngs)+.9;
  const tx=lng=>((lng-minLng)/(maxLng-minLng))*(W-PAD*2)+PAD;
  const ty=lat=>(1-(lat-minLat)/(maxLat-minLat))*(H-PAD*2)+PAD;
  const segs=[];
  if (configuredDepot) segs.push({ x1:tx(configuredDepot.lng), y1:ty(configuredDepot.lat), x2:tx(pts[0].lng), y2:ty(pts[0].lat), dead:true });
  for (let index=0; index<pts.length-1; index+=1) segs.push({ x1:tx(pts[index].lng), y1:ty(pts[index].lat), x2:tx(pts[index+1].lng), y2:ty(pts[index+1].lat), dead:false });
  if (configuredDepot) segs.push({ x1:tx(pts[pts.length-1].lng), y1:ty(pts[pts.length-1].lat), x2:tx(configuredDepot.lng), y2:ty(configuredDepot.lat), dead:true });
  const named=[
    ...(configuredDepot ? [{ geo:configuredDepot, color: PX.navy800, label:"Configured depot", yard:true }] : []),
    ...pts.map((p,i)=>({ geo:p, color:i===0?PX.teal700:i===pts.length-1?PX.brandRed:PX.navy600,
      label:(p.name||"").split(",")[0].substring(0,16), yard:false })),
  ];
  return <div>
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block", height: height, background: darkMode ? "#111827" : PX.gray50, borderRadius: minimal ? 0 : 12, border: minimal ? "none" : `1.5px solid ${darkMode ? "#374151" : PX.gray200}` }}>
      <defs>
        <marker id="a1" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M1,1 L6,3.5 L1,6Z" fill={PX.navy600}/>
        </marker>
        <marker id="a2" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M1,1 L6,3.5 L1,6Z" fill="#c8d0e0"/>
        </marker>
      </defs>
      {[0,1,2,3,4,5].map(i=>(
        <g key={i}>
          <line x1={PAD} y1={PAD+i*(H-PAD*2)/5} x2={W-PAD} y2={PAD+i*(H-PAD*2)/5} stroke="#edf0f7" strokeWidth="1"/>
          <line x1={PAD+i*(W-PAD*2)/5} y1={PAD} x2={PAD+i*(W-PAD*2)/5} y2={H-PAD} stroke="#edf0f7" strokeWidth="1"/>
        </g>
      ))}
      {segs.map((s,i)=>(
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={s.dead?"#cbd5e1":PX.navy600} strokeWidth={s.dead?1.5:2.5}
          strokeDasharray={s.dead?"6,4":"none"} markerEnd={s.dead?"url(#a2)":"url(#a1)"} strokeLinecap="round"/>
      ))}
      {journey?.journeyType === "return" && pts.slice(0, -1).map((point, index) => {
        const next = pts[index + 1];
        return <line key={`return-${index}`} x1={tx(next.lng)} y1={ty(next.lat)} x2={tx(point.lng)} y2={ty(point.lat)} stroke="#E5485D" strokeWidth="2.5" strokeDasharray="5,5" strokeLinecap="round"/>;
      })}
      {named.map((p,i)=>{
        const x=tx(p.geo.lng), y=ty(p.geo.lat), above=y<H/2;
        return <g key={i}>
          {p.yard
            ? <polygon points={`${x},${y-8} ${x+8},${y} ${x},${y+8} ${x-8},${y}`} fill={p.color} stroke="#fff" strokeWidth={2}/>
            : <circle cx={x} cy={y} r={6} fill={p.color} stroke="#fff" strokeWidth={2}/>}
          <text x={x} y={above?y+17:y-11} textAnchor="middle" fontSize={9.5} fill="#374151" fontWeight="600">
            {p.label.length>16?p.label.substring(0,14)+"…":p.label}
          </text>
        </g>;
      })}
    </svg>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, marginTop:12 }}>
      {[["Total route",`${result.totalKm} ${gv?.distanceUnit === "miles" ? "mi" : "km"}`],[`Revenue ${gv?.distanceUnit === "miles" ? "mi" : "km"}`,`${result.revenueKm} ${gv?.distanceUnit === "miles" ? "mi" : "km"}`],
        ["Duration",`${result.totalShiftHrs}h`],["Days",result.opDays]].map(([l,v])=>(
        <div key={l} style={{ background: darkMode ? "#111827" : PX.gray50, border: `1px solid ${darkMode ? "#374151" : PX.gray200}`, borderRadius:8, padding:"8px", textAlign:"center" }}>
          <div style={{ fontSize:12, fontWeight:700, color: darkMode ? "#6b7280" : PX.gray400, textTransform:"uppercase", marginBottom:2 }}>{l}</div>
          <div style={{ fontSize:15, fontWeight:800, color:PX.navy700 }}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{ display:"flex", gap:14, marginTop:10, justifyContent:"center", fontSize:13, color: darkMode ? "#9ca3af" : PX.gray600 }}>
      <span style={{ display:"flex",alignItems:"center",gap:5 }}><span style={{ width:12,height:3,background:PX.navy600,borderRadius:2,display:"inline-block" }}/>Live Route</span>
      <span style={{ display:"flex",alignItems:"center",gap:5 }}><span style={{ width:12,height:1.5,background:"#cbd5e1",borderRadius:2,borderTop:"1.5px dashed #cbd5e1",display:"inline-block" }}/>Dead Mileage</span>
      <span style={{ display:"flex",alignItems:"center",gap:5 }}><span style={{ width:8,height:8,background:PX.navy800,transform:"rotate(45deg)",display:"inline-block" }}/>Depot</span>
    </div>
  </div>;
}

function JourneyRouteDetails({ journey, darkMode=false }) {
  const stops = getJourneyStops(journey);
  const typeLabel = journey?.journeyType === "return" ? "Return journey" : stops.length > 0 || journey?.journeyType === "multi-stop" ? "Multi-stop journey" : "One-way journey";
  const formatDateTime = value => {
    if (!value) return "Not set";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
  };
  const panel = darkMode ? "#1f2937" : "#f8fafc";
  const border = darkMode ? "#374151" : "#e2e8f0";
  const text = darkMode ? "#f3f4f6" : PX.navy800;
  const muted = darkMode ? "#9ca3af" : PX.gray500;
  return <div className="journey-route-details" style={{ marginBottom:12 }}>
    <div style={{ fontSize:12, fontWeight:800, color:darkMode ? "#94a3b8" : PX.gray400, textTransform:"uppercase", letterSpacing:1, marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
      <span>Route & Schedule</span><div style={{ flex:1, height:1, background:border }}/>
    </div>
    <div style={{ background:panel, border:`1px solid ${border}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:12, padding:"8px 11px", borderBottom:`1px solid ${border}` }}>
        <strong style={{ color:text, fontSize:14 }}>{typeLabel}</strong>
        <span style={{ color:muted, fontSize:13 }}>{formatDateTime(journey?.departureDate)}</span>
      </div>
      <div style={{ padding:"9px 11px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"20px 1fr", gap:"5px 6px", alignItems:"start" }}>
          <span style={{ width:20, height:20, borderRadius:"50%", background:"#0f766e", color:"white", display:"grid", placeItems:"center", fontSize:12, fontWeight:900 }}>A</span>
          <div><div style={{ color:muted, fontSize:12, fontWeight:700, textTransform:"uppercase" }}>Pickup</div><div style={{ color:text, fontSize:14, fontWeight:700 }}>{journey?.origin || "Not set"}</div></div>
          {stops.map((stop, index) => <Fragment key={`${stop.place || stop.name || "stop"}-${index}`}><span style={{ width:20, height:20, borderRadius:"50%", background:"#334155", color:"white", display:"grid", placeItems:"center", fontSize:12, fontWeight:900 }}>{index + 1}</span><div><div style={{ color:muted, fontSize:12, fontWeight:700, textTransform:"uppercase" }}>Stop {index + 1}{stop.wait ? ` - ${stop.wait} min wait` : ""}</div><div style={{ color:text, fontSize:14, fontWeight:700 }}>{stop.place || stop.name || "Saved stop"}</div></div></Fragment>)}
          <span style={{ width:20, height:20, borderRadius:"50%", background:PX.brandRed, color:"white", display:"grid", placeItems:"center", fontSize:12, fontWeight:900 }}>B</span>
          <div><div style={{ color:muted, fontSize:12, fontWeight:700, textTransform:"uppercase" }}>Destination</div><div style={{ color:text, fontSize:14, fontWeight:700 }}>{journey?.destination || "Not set"}</div></div>
          {journey?.journeyType === "return" && <><span style={{ width:20, height:20, borderRadius:"50%", border:"2px dashed #E5485D", color:"#E5485D", display:"grid", placeItems:"center", fontSize:11, fontWeight:900 }}>R</span><div><div style={{ color:"#E5485D", fontSize:12, fontWeight:800, textTransform:"uppercase" }}>Return - {formatDateTime(journey?.returnDate)}</div><div style={{ color:text, fontSize:14, fontWeight:700 }}>{journey?.destination || "Destination"} to {journey?.origin || "pickup"}</div></div></>}
        </div>
        {Number(journey?.waitingMins) > 0 && <div style={{ marginTop:7, paddingTop:7, borderTop:`1px solid ${border}`, color:muted, fontSize:13 }}><strong style={{ color:text }}>Additional waiting:</strong> {Number(journey.waitingMins)} minutes</div>}
      </div>
    </div>
  </div>;
}

function printBookingPdfLegacy(booking) {
  const esc = value => String(value ?? "-").replace(/[&<>"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
  const date = value => value ? new Date(value).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "Not set";
  const money = value => Number.isFinite(Number(value)) ? `£${Number(value).toFixed(2)}` : "-";
  const row = (label, value) => `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;
  const journey = booking.journey || {};
  const quote = booking.quote || {};
const result = quote.result || {};
  const breakdown = result.breakdown || {};
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const points = (journey.wpCoords || []).filter(point => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)));
  const mapPath = result.geometry ? "&path=color:0x16205c|weight:5|enc:" + encodeURIComponent(result.geometry) : "";
  const mapMarkers = points.slice(0, 10).map((point, index) => "&markers=color:" + (index === 0 ? "0x0f766e" : index === points.length - 1 ? "0xd2232a" : "0x64748b") + "|label:" + (index === 0 ? "A" : index === points.length - 1 ? "B" : index) + "|" + point.lat + "," + point.lng).join("");
  const mapImage = mapKey && (result.geometry || points.length > 1) ? "https://maps.googleapis.com/maps/api/staticmap?size=1200x500&scale=2&maptype=roadmap&language=en-GB&region=GB" + mapPath + mapMarkers + "&key=" + encodeURIComponent(mapKey) : "";
  const rows = [
    row("Booking reference", `#${booking.id}`),
    row("Status", String(booking.status || "NEW").toUpperCase()),
    row("Pickup", journey.origin),
    row("Destination", journey.destination),
    row("Journey", journey.journeyType === "return" ? "Return" : "One-way"),
    row("Departure", date(journey.departureDate)),
    ...(journey.journeyType === "return" ? [row("Return", date(journey.returnDate))] : []),
    row("Customer", booking.customer?.name),
    row("Email", booking.customer?.email),
    row("Phone", booking.customer?.phone),
    row("Vehicle", quote.vehicle?.name),
    row("Passengers", journey.passengers),
    row("Suitcases 23KG+", journey.suitcaseCount),
    row("Handbags", journey.handbagCount),
    row("Special requests", journey.specialRequests || "None"),
    row("Distance", `${result.totalKm ?? "-"} ${result.distanceUnit === "miles" ? "mi" : "km"}`),
    row("Revenue distance", `${result.revenueKm ?? "-"} ${result.distanceUnit === "miles" ? "mi" : "km"}`),
    row("Estimated duration", `${result.totalShiftHrs ?? "-"} hours`),
    row("Quoted fare", money(result.finalPrice)),
    row("Upper price bound", money(result.upperBoundPrice)),
    ...Object.entries(breakdown).map(([key, value]) => row(key.replace(/([a-z])([A-Z])/g, "$1 $2"), typeof value === "number" ? money(value) : value))
  ].join("");
  const popup = window.open("", "_blank");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>Carolean Coaches - Quote #${esc(booking.id)}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#16205c;margin:0;font-size:11px}header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #d2232a;padding-bottom:12px;margin-bottom:18px}header img{width:190px;max-height:58px;object-fit:contain;object-position:left}h1{font-size:22px;margin:0 0 4px}h2{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;border-bottom:1px solid #dbe2ef;padding-bottom:6px;margin:18px 0 8px}table{width:100%;border-collapse:collapse}th,td{padding:7px 8px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}th{width:34%;color:#64748b;font-weight:700}td{color:#111827;font-weight:600}footer{margin-top:24px;padding-top:10px;border-top:1px solid #dbe2ef;color:#64748b;font-size:10px;text-align:center}</style></head><body><header><img src="/carolean%20image.png" alt="Carolean Coaches"><div><h1>Quote Details</h1><div>Generated by Carolean Coaches</div></div></header><h2>Quotation</h2><table>${rows}</table><footer>Carolean Coaches · This document is generated from the stored quotation details.</footer></body></html>`);
  popup.document.close();
  popup.document.head.insertAdjacentHTML("beforeend", "<style>body{max-width:760px;margin:0 auto;padding:10px 0;color:#16205c}header{background:#fff}table{font-size:11px;box-shadow:0 2px 8px rgba(15,23,42,.06)}th{background:#f8fafc}h2{margin-top:20px}.report-hero{display:flex;justify-content:space-between;gap:16px;background:#f1f5f9;border-left:5px solid #d2232a;border-radius:8px;padding:12px 14px;margin:0 0 14px}.report-hero strong{font-size:16px}.report-hero span{display:block;color:#64748b;margin-top:3px}.route-snapshot{break-inside:avoid}.route-snapshot img{display:block;width:100%;height:250px;object-fit:cover;border:1px solid #dbe2ef;border-radius:9px}.route-snapshot .missing{height:80px;display:grid;place-items:center;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:9px;color:#64748b}</style>");
  popup.document.body.insertAdjacentHTML("afterbegin", "<div class='report-hero'><div><strong>" + esc(journey.origin || "Pickup") + " → " + esc(journey.destination || "Destination") + "</strong><span>Ref #" + esc(booking.id) + " · " + esc(String(booking.status || "NEW").toUpperCase()) + "</span></div><div>" + esc(journey.journeyType === "return" ? "Return journey" : "One-way journey") + "<br>" + esc(date(journey.departureDate)) + "</div></div><section class='route-snapshot'><h2>Route map</h2>" + (mapImage ? "<img src='" + mapImage + "' alt='Route map'>" : "<div class='missing'>Route map snapshot unavailable for this quotation</div>") + "</section>");
  popup.onafterprint = () => popup.close();
  setTimeout(() => popup.print(), 300);
}

function printBookingPdf(booking) {
  const journey = booking.journey || {};
  const quote = booking.quote || {};
  const result = quote.result || {};
  const displayedDeadDistance = Math.max(0, Number(result.totalKm || 0) - Number(result.revenueKm || 0));
  const breakdown = result.breakdown || {};
  const breakdownDistanceCost = Number(breakdown.distanceCost) || 0;
  const breakdownTotalDistance = Number(result.totalKm) || 0;
  const breakdownLiveDistance = Number(result.revenueKm) || 0;
  const breakdownDeadDistance = Math.max(0, Number(result.deadKm ?? (breakdownTotalDistance - breakdownLiveDistance)) || 0);
  const breakdownLiveCost = Number.isFinite(Number(breakdown.liveDistanceCost)) ? Number(breakdown.liveDistanceCost) : (breakdownTotalDistance > 0 ? breakdownDistanceCost * breakdownLiveDistance / breakdownTotalDistance : 0);
  const breakdownDeadCost = Number.isFinite(Number(breakdown.deadDistanceCost)) ? Number(breakdown.deadDistanceCost) : (breakdownTotalDistance > 0 ? breakdownDistanceCost * breakdownDeadDistance / breakdownTotalDistance : 0);
  const printableBreakdown = { ...breakdown, liveDistanceCost: breakdownLiveCost, deadDistanceCost: breakdownDeadCost };
  const esc = value => String(value ?? "--").replace(/[&<>"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key) && object[key] !== null && object[key] !== undefined && object[key] !== "";
  const text = value => value === null || value === undefined || value === "" ? "--" : String(value);
  const money = value => Number.isFinite(Number(value)) ? `£${Number(value).toFixed(2)}` : "--";
  const dateTime = value => {
    if (!value) return "--";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
  };
  const dateOnly = value => {
    if (!value) return "--";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
  };
  const timeOnly = value => {
    if (!value) return "--";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "--" : parsed.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
  };
  const field = (label, value) => `<div class="field"><span>${esc(label)}</span><strong>${esc(text(value))}</strong></div>`;
  const metric = (label, value) => `<div class="metric"><span>${esc(label)}</span><strong>${esc(text(value))}</strong></div>`;
  const moneyRow = (label, key, className = "") => has(printableBreakdown, key) ? `<div class="money-row ${className}"><span>${esc(label)}</span><strong>${money(printableBreakdown[key])}</strong></div>` : "";
  const stops = getJourneyStops(journey);
  const distanceUnit = result.distanceUnit === "miles" ? "mi" : "km";
  const finalFare = result.finalPrice ?? result.finalFare;
  const vehicleName = quote.vehicle?.name || journey.vehicleName;
  const vehicleCapacity = quote.vehicle?.seats || quote.vehicle?.capacity || quote.vehicle?.seatCapacity;
  const resultVat = result.vat ?? result.vatAmount ?? result.tax;
  const customerTotal = result.customerTotal ?? result.totalIncVat ?? result.total;
  const stopRows = stops.map((stop, index) => `<div class="timeline-row"><b>${index + 1}</b><div><small>STOP ${index + 1}${stop.wait ? ` · ${esc(stop.wait)} MIN WAIT` : ""}</small><strong>${esc(stop.place || stop.name || "Saved stop")}</strong></div></div>`).join("");
  const timeline = `<div class="timeline"><div class="timeline-row"><b>A</b><div><small>OUTWARD · PICKUP</small><strong>${esc(journey.origin)}</strong><span>${esc(dateTime(journey.departureDate))}</span></div></div>${stopRows}<div class="timeline-row"><b class="end">B</b><div><small>DESTINATION</small><strong>${esc(journey.destination)}</strong></div></div>${journey.journeyType === "return" ? `<div class="timeline-row return"><b>R</b><div><small>RETURN · ${esc(dateTime(journey.returnDate))}</small><strong>${esc(journey.destination)} → ${esc(journey.origin)}</strong></div></div>` : ""}</div>`;
  const costRows = [
    has(result, "revenueKm") ? `<div class="money-row"><span>Live-leg miles</span><strong>${esc(text(result.revenueKm))} ${esc(distanceUnit)}</strong></div>` : "",
    has(result, "deadKm") ? `<div class="money-row"><span>Dead-leg miles</span><strong>${esc(text(result.deadKm))} ${esc(distanceUnit)}</strong></div>` : "",
    moneyRow("Live-leg running cost", "liveDistanceCost"), moneyRow("Dead-leg running cost", "deadDistanceCost"), moneyRow("Distance cost", "distanceCost"), moneyRow("Fuel cost", "fuelCost"), moneyRow("Maintenance cost", "maintenanceCost"), moneyRow("Tyre cost", "tyreCost"), moneyRow("Driver cost", "driverCost"), moneyRow("Standing cost", "standingCost"), moneyRow("Overnight / subsistence", "overnightCost"), moneyRow("Waiting cost", "waitingCost"), moneyRow("Surcharges", "surchargeTotal"), moneyRow("Allocated vehicle overhead", "allocatedStanding"), moneyRow("Allocated company overhead", "allocatedOverhead")
  ].join("");
  const profitabilityRows = [moneyRow("Gross profit", "grossProfit"), moneyRow("Net profit", "netProfit"), has(breakdown, "marginPct") ? `<div class="money-row"><span>Gross margin</span><strong>${esc(breakdown.marginPct)}%</strong></div>` : "", has(breakdown, "netMarginPct") ? `<div class="money-row"><span>Net margin</span><strong>${esc(breakdown.netMarginPct)}%</strong></div>` : "", moneyRow("Profit floor", "profitFloor"), moneyRow("Net profit target", "netProfitTarget")].join("");
  const operationalRows = [
    ["Commercial weight", has(breakdown, "commercialWeight") ? breakdown.commercialWeight : null],
    ["Driver rate", has(breakdown, "driverRate") ? `${money(breakdown.driverRate)}/h` : null],
    ["Driver count", has(breakdown, "driverCount") ? breakdown.driverCount : null],
    ["Daily driving limit", has(breakdown, "dailyDrivingLimit") ? `${breakdown.dailyDrivingLimit} h` : null],
    ["Mandatory break", has(breakdown, "mandatoryBreakHours") ? `${breakdown.mandatoryBreakHours} h` : null],
    ["Waiting hours", has(breakdown, "waitingHours") ? `${breakdown.waitingHours} h` : null],
    ["Customer range", has(breakdown, "customerRangePct") ? `${breakdown.customerRangePct}%` : null],
    ["Operating days", has(result, "opDays") ? result.opDays : null],
    ["Pricing method", has(result, "pricingMethod") ? result.pricingMethod : null]
  ].filter(([, value]) => value !== null).map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
  const transparentRows = [
    ["Live legs", has(result, "revenueKm") ? `${result.revenueKm} ${distanceUnit}` : null],
    ["Dead legs", has(result, "totalKm") && has(result, "revenueKm") ? `${displayedDeadDistance} ${distanceUnit}` : null],
    ["Total driven", has(result, "totalKm") ? `${result.totalKm} ${distanceUnit}` : null],
    ["Driving time", has(result, "liveDurationMinutes") ? `${result.liveDurationMinutes} min` : null],
    ["Empty running time", has(result, "emptyRunningMinutes") ? `${result.emptyRunningMinutes} min` : null],
    ["Driver paid time", has(result, "driverPaidMinutes") ? `${result.driverPaidMinutes} min` : null],
    ["Base price", has(result, "baseFare") ? money(result.baseFare) : null],
    ["Minimum hire floor", has(quote.vehicle, "minimumHire") ? money(quote.vehicle.minimumHire) : null],
    ["Live-leg running cost", money(breakdownLiveCost)],
    ["Dead-leg running cost", money(breakdownDeadCost)],
    ["Target margin", Number(breakdown.marginPct) > 0 ? `${breakdown.marginPct}%` : Number(breakdown.netMarginPct) > 0 ? `${breakdown.netMarginPct}%` : null],
    ["Customer pays", has(result, "finalPrice") || has(result, "finalFare") ? money(finalFare) : null],
    ["Discount", has(result, "discountAmount") ? money(result.discountAmount) : has(result, "discount") ? money(result.discount) : null],
    ["Discount %", has(result, "discountPct") ? `${result.discountPct}%` : null]
  ].filter(([, value]) => value !== null).map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
  const reportHtml = `<header class="report-header"><img src="/carolean%20image.png" alt="Carolean Coaches"><div class="report-heading"><div class="eyebrow">QUOTATION REPORT</div><h1>#${esc(booking.id)}</h1><div class="badges"><span>${esc(String(booking.status || "NEW").toUpperCase())}</span><span>${esc(journey.journeyType === "return" ? "RETURN" : stops.length ? "MULTI-STOP" : "ONE-WAY")}</span></div></div></header><section class="route-head"><div><span class="eyebrow">JOURNEY</span><h2>${esc(journey.origin || "Pickup")} <i>→</i> ${esc(journey.destination || "Destination")}</h2></div><div class="route-dates"><strong>${esc(dateOnly(journey.departureDate))}</strong><span>Departure ${esc(timeOnly(journey.departureDate))}${journey.journeyType === "return" ? ` · Return ${esc(timeOnly(journey.returnDate))}` : ""}</span></div></section><section class="section route-section"><div class="section-title">ROUTE &amp; JOURNEY</div>${timeline}</section><div class="metrics">${metric("Total distance", `${text(result.totalKm)} ${distanceUnit}`)}${metric("Est. duration", `${text(result.totalShiftHrs)} h`)}${metric("Live miles", `${text(result.revenueKm)} ${distanceUnit}`)}${metric("Revenue miles", `${text(result.revenueKm)} ${distanceUnit}`)}${has(result, "deadKm") ? metric("Dead miles", `${text(result.deadKm)} ${distanceUnit}`) : ""}</div><section class="section"><div class="section-title">CUSTOMER &amp; BOOKING</div><div class="three-col"><div>${field("Customer", booking.customer?.name)}${field("Phone", booking.customer?.phone)}${field("Email", booking.customer?.email)}</div><div>${field("Passengers", journey.passengers)}${field("Suitcases 23KG+", journey.suitcaseCount)}${field("Handbags", journey.handbagCount)}</div><div>${field("Vehicle", vehicleName)}${field("Capacity", vehicleCapacity ? `${vehicleCapacity} seats` : "--")}${field("Vehicles", result.vehicleCount || quote.vehicleCount || "--")}</div></div>${journey.specialRequests ? `<div class="special"><span>Special request</span>${esc(journey.specialRequests)}</div>` : ""}</section><section class="section fare-section"><div class="section-title">FARE SUMMARY</div><div class="fare-grid"><div>${has(result, "baseFare") ? `<div class="fare-line"><span>Base rate${vehicleName ? ` · ${esc(vehicleName)}` : ""}</span><strong>${money(result.baseFare)}</strong></div>` : ""}${has(result, "surchargeTotal") ? `<div class="fare-line"><span>Surcharges</span><strong>${money(result.surchargeTotal)}</strong></div>` : ""}${has(result, "subtotal") ? `<div class="fare-line"><span>Subtotal</span><strong>${money(result.subtotal)}</strong></div>` : ""}${has(result, "upperBoundPrice") || has(result, "upperBoundFare") ? `<div class="fare-line"><span>Upper price bound</span><strong>${money(result.upperBoundPrice ?? result.upperBoundFare)}</strong></div>` : ""}</div><div class="fare-total"><span>NET FARE</span><strong>${money(finalFare)}</strong><div class="vat-line"><span>VAT</span><b>${money(resultVat)}</b></div><div class="customer-total"><span>CUSTOMER TOTAL</span><strong>${money(customerTotal)}</strong></div></div></div></section><section class="section transparent-section"><div class="section-title">TRANSPARENT PRICE BREAKDOWN</div><div class="transparent-grid">${transparentRows || `<div class="empty">No additional stored pricing details for this quotation</div>`}</div></section><div class="bottom-grid"><section class="section"><div class="section-title">COST BREAKDOWN</div><div class="money-table">${costRows || `<div class="empty">No stored cost breakdown for this quotation</div>`}</div></section><section class="section"><div class="section-title">PROFITABILITY</div><div class="money-table">${profitabilityRows || `<div class="empty">No stored profitability values for this quotation</div>`}</div></section></div><section class="section operational"><div class="section-title">OPERATIONAL PRICING DETAILS</div><div class="operational-grid">${operationalRows || `<div class="empty">No additional pricing-engine details for this quotation</div>`}</div></section><footer><span>Carolean Coaches · Internal Quotation Report</span><span>Generated ${esc(dateTime(new Date()))} · Quote #${esc(booking.id)}</span></footer>`;
  const reportCss = `@page{size:A4 portrait;margin:7mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;padding:0;background:#fff;color:#17233f;font-family:Arial,Helvetica,sans-serif;font-size:9px;line-height:1.28}body{max-width:196mm;margin:0 auto}.report-header{height:15mm;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #d2232a}.report-header img{width:47mm;max-height:11mm;object-fit:contain;object-position:left}.report-heading{text-align:right}.eyebrow,.section-title{font-size:8px;font-weight:800;letter-spacing:1.1px;color:#64748b}.report-heading h1{font-size:16px;line-height:1;margin:2px 0 4px;color:#16205c}.badges{display:flex;justify-content:flex-end;gap:4px}.badges span{padding:2px 6px;border-radius:3px;background:#eef2f7;color:#16205c;font-size:7px;font-weight:800;letter-spacing:.5px}.badges span:first-child{background:#fce8eb;color:#b91c2a}.route-head{display:flex;justify-content:space-between;gap:12px;padding:3mm 0 2mm}.route-head h2{font-size:16px;line-height:1.1;margin:3px 0 0;color:#16205c}.route-head h2 i{font-style:normal;color:#d2232a;padding:0 5px}.route-dates{text-align:right;padding-top:3px}.route-dates strong,.route-dates span{display:block}.route-dates strong{font-size:11px;color:#16205c}.route-dates span{margin-top:2px;color:#64748b}.section{border:1px solid #e2e8f0;border-radius:5px;padding:2.2mm;background:#fff;break-inside:avoid;page-break-inside:avoid}.section-title{border-bottom:1px solid #e2e8f0;padding-bottom:3px;margin-bottom:4px;color:#16205c}.route-section{padding-bottom:1.5mm}.timeline{display:flex;flex-direction:column;gap:5px}.timeline-row{display:grid;grid-template-columns:16px 1fr;gap:6px;align-items:start;position:relative}.timeline-row:not(:last-child):after{content:"";position:absolute;left:7px;top:17px;height:calc(100% + 1px);border-left:1px solid #cbd5e1}.timeline-row b{z-index:1;width:15px;height:15px;display:grid;place-items:center;border-radius:50%;background:#0f766e;color:#fff;font-size:7px}.timeline-row b.end{background:#d2232a}.timeline-row.return b{background:#fff;border:1px dashed #d2232a;color:#d2232a}.timeline-row small{display:block;color:#64748b;font-size:7px;font-weight:800;letter-spacing:.4px}.timeline-row strong{display:block;color:#16205c;font-size:9px}.timeline-row span{display:block;color:#64748b;font-size:8px}.metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:1.5mm;margin:1.8mm 0}.metric{background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:1.8mm}.metric span{display:block;color:#64748b;font-size:7px;text-transform:uppercase;letter-spacing:.35px}.metric strong{display:block;margin-top:1px;color:#16205c;font-size:12px}.three-col{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}.field{margin:0 0 3px}.field span,.special span{display:block;color:#64748b;font-size:7px;text-transform:uppercase;letter-spacing:.35px}.field strong{display:block;color:#16205c;font-size:9px;font-weight:700;overflow-wrap:anywhere}.special{margin-top:3px;padding-top:4px;border-top:1px solid #eef2f7;color:#334155}.special span{display:inline;margin-right:6px}.fare-section{background:#f8fafc}.fare-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:8mm;align-items:stretch}.fare-line,.money-row{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #e8edf3;padding:3px 0}.fare-line strong,.money-row strong{font-variant-numeric:tabular-nums;color:#16205c}.fare-total{border-left:1px solid #dbe2ef;padding-left:6mm}.fare-total>span,.vat-line span,.customer-total span{display:block;color:#64748b;font-size:7px;font-weight:800;letter-spacing:.5px}.fare-total>strong{display:block;color:#16205c;font-size:19px;line-height:1.05;margin:2px 0 5px}.vat-line{display:flex;justify-content:space-between;color:#64748b;border-bottom:1px solid #dbe2ef;padding-bottom:3px}.customer-total{display:flex;justify-content:space-between;align-items:end;padding-top:4px}.customer-total strong{color:#d2232a;font-size:14px}.transparent-section{margin-top:2mm;background:#fbfcfd}.transparent-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px 8mm}.transparent-grid>div{display:flex;justify-content:space-between;border-bottom:1px solid #eef2f7;padding:2px 0;gap:4px}.transparent-grid span{color:#64748b}.transparent-grid strong{color:#16205c;font-variant-numeric:tabular-nums}.bottom-grid{display:grid;grid-template-columns:1.14fr .86fr;gap:3mm;margin-top:2mm}.bottom-grid .section{min-width:0}.money-table{font-size:8px}.empty{color:#94a3b8;font-style:italic;padding:3px 0}.operational{margin-top:2mm;background:#fbfcfd}.operational-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2px 8mm}.operational-grid>div{display:flex;justify-content:space-between;border-bottom:1px solid #eef2f7;padding:2px 0;gap:4px}.operational-grid span{color:#64748b}.operational-grid strong{color:#16205c;font-variant-numeric:tabular-nums}.report-header,.route-head,.section,.metrics,footer{break-inside:avoid;page-break-inside:avoid}footer{display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;margin-top:1.8mm;padding-top:1.8mm;color:#64748b;font-size:7px}@media print{body{max-width:none}a{color:inherit;text-decoration:none}}`;
  const popup = window.open("", "_blank");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Carolean Coaches - Quote #${esc(booking.id)}</title><style>${reportCss}</style></head><body>${reportHtml}</body></html>`);
  popup.document.close();
  popup.onafterprint = () => popup.close();
  const print = () => { popup.focus(); popup.print(); };
  const printWhenImagesReady = () => {
    const images = Array.from(popup.document.images);
    const ready = images.length ? Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => { image.addEventListener("load", resolve, { once: true }); image.addEventListener("error", resolve, { once: true }); }))) : Promise.resolve();
    ready.then(() => setTimeout(print, 150));
  };
  printWhenImagesReady();
}

// ── Navbar ────────────────────────────────────────────────────────────────────
// ── VehicleCard (Step 2 equivalent) ──────────────────────────────────────────
// ── Admin Dashboard ────────────────────────────────────────────────────────────
const STAFF_PERMISSION_LABELS = {
  dashboard:'Dashboard', bookings:'Quotations', fleet:'Fleet', pricing:'Pricing', settings:'Settings'
};
const STAFF_PERMISSIONS = Object.keys(STAFF_PERMISSION_LABELS);
// Shared by the activity-log display and the autosave diff-builder: splits
// camelCase/snake_case into words so raw keys like "marginWeekday" read as
// "Margin Weekday" without needing a maintained per-field label map.
const prettyField = key => String(key || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().replace(/^./, c => c.toUpperCase()) || 'Field';

function StaffAccessPanel({ setToast }) {
  const [staff, setStaff] = useState([]);
  const [permissions, setPermissions] = useState(STAFF_PERMISSIONS);
  const [selected, setSelected] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [activityRange, setActivityRange] = useState('today');
  const today = new Date().toLocaleDateString('en-CA');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [form, setForm] = useState({ name:'', email:'', role:'quotes', permissions:['dashboard','quotes','bookings'] });

  const loadStaff = useCallback(async () => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/staff`, { cache:'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Unable to load staff access');
    setStaff(payload.staff || []); setPermissions((payload.permissions || STAFF_PERMISSIONS).filter(item => item !== 'staff'));
    setSelected(current => current ? (payload.staff || []).find(item => item.id === current.id) || null : null);
  }, []);

  useEffect(() => {
    loadStaff().catch(error => setToast(error.message));
    const poll = window.setInterval(()=>loadStaff().catch(()=>{}), 10000);
    const tick = window.setInterval(()=>setClock(Date.now()), 1000);
    return () => { window.clearInterval(poll); window.clearInterval(tick); };
  }, [loadStaff, setToast]);

  const sendAccessEmail = async (member, link, kind) => {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    const response = await fetch('/api/staff-access-email', { method:'POST', headers:{'Content-Type':'application/json','X-Admin-Token':token}, body:JSON.stringify({ email:member.email, name:member.name, link, kind }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Access was created, but the email could not be sent');
  };

  const invite = async event => {
    event.preventDefault(); setBusy(true);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/staff/invite`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form,baseUrl:window.location.origin}) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to invite this member');
      setForm({name:'',email:'',role:'quotes',permissions:['dashboard','quotes','bookings']}); setShowInvite(false);
      await loadStaff();
      try { await sendAccessEmail(payload.staff, payload.link, 'invite'); setToast('Invitation sent'); }
      catch (emailError) { setToast(`Invitation saved and shown below, but email failed: ${emailError.message}`); }
    } catch (error) { setToast(error.message); }
    finally { setBusy(false); setTimeout(() => setToast(''), 3500); }
  };

  const memberAction = async (member, action, body = {}) => {
    setBusy(true);
    try {
      const method = action === 'update' ? 'PUT' : action === 'remove' ? 'DELETE' : 'POST';
      const endpoint = action === 'update' || action === 'remove' ? '/api/admin/staff' : `/api/admin/staff/${action}`;
      const response = await authenticatedFetch(API_BASE_URL + endpoint, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:member.id,baseUrl:window.location.origin,...body}) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to update staff access');
      if (action === 'resend' || action === 'reset') await sendAccessEmail(member, payload.link, action === 'reset' ? 'reset' : 'invite');
      if (action === 'remove') setSelected(null);
      await loadStaff(); setToast(action === 'reset' ? 'Password reset sent' : action === 'resend' ? 'Invitation resent' : 'Staff access updated');
    } catch (error) { setToast(error.message); }
    finally { setBusy(false); setTimeout(() => setToast(''), 3500); }
  };

  const formatDate = value => value ? new Date(value).toLocaleString('en-GB', {dateStyle:'medium',timeStyle:'short'}) : 'Never';
  const formatUsage = minutes => Number(minutes) < 1 ? '—' : `${Math.floor(Number(minutes)/60)}h ${Math.round(Number(minutes)%60)}m`;
  const formatSeconds = seconds => `${Math.floor(Number(seconds)/3600)}h ${Math.floor(Number(seconds)%3600/60)}m ${Math.floor(Number(seconds)%60)}s`;
  // The backend sometimes sends the literal placeholder "Updated" instead of
  // a real value when it only knows a section changed, not the specific old
  // and new values — treat that placeholder as "no value", not a real one,
  // so it renders as a plain "changed" instead of a fake "added Updated".
  const hasValue = value => value !== null && value !== undefined && value !== '' && value !== 'Updated';
  const describeChange = change => {
    const before = hasValue(change.before), after = hasValue(change.after);
    if (before && after) return <>was <b className="font-bold text-slate-700 dark:text-slate-300">{String(change.before)}</b> {'→'} now <b className="font-bold text-slate-900 dark:text-white">{String(change.after)}</b></>;
    if (after) return <>{'→'} added <b className="font-bold text-emerald-700 dark:text-emerald-400">{String(change.after)}</b></>;
    if (before) return <>was <b className="font-bold text-slate-700 dark:text-slate-300">{String(change.before)}</b> {'→'} <b className="font-bold text-red-600 dark:text-red-400">removed</b></>;
    return 'updated';
  };

  const bounds = (() => {
    if (activityRange === 'overall') return [null, null];
    const end = new Date(), start = new Date();
    if (activityRange === 'week') start.setDate(end.getDate() - 6);
    if (activityRange === 'month') start.setDate(1);
    return activityRange === 'custom' ? [dateFrom, dateTo] : [start.toLocaleDateString('en-CA'), end.toLocaleDateString('en-CA')];
  })();
  const inRange = date => !bounds[0] || (date >= bounds[0] && date <= bounds[1]);
  const dailyRecords = selected ? Object.entries(selected.usageByDate || {}).filter(([date])=>inRange(date)) : [];
  const allDailyMinutes = Object.values(selected?.usageByDate || {}).reduce((sum,day)=>sum+Number(day.minutes||0),0);
  const legacySeconds = activityRange === 'overall' ? Math.max(0, Number(selected?.usageMinutes||0) - allDailyMinutes) * 60 : 0;
  const liveSeconds = selected?.sessionLastSeenAt && clock - new Date(selected.sessionLastSeenAt).getTime() < 15000 ? Math.max(0, Math.floor((clock-new Date(selected.sessionLastSeenAt).getTime())/1000)) : 0;
  const selectedUsage = legacySeconds + liveSeconds + dailyRecords.reduce((sum,[,day])=>sum+Number(day.minutes||0)*60+Number(day.seconds||0),0);
  const selectedLogins = dailyRecords.reduce((sum,[,day])=>sum+Number(day.logins||0),0);
  const selectedActivities = (selected?.activities || []).filter(item=>inRange(new Date(item.createdAt).toLocaleDateString('en-CA')));

  return <>
    <section className="settings-staff col-span-12 rounded-xl border-[1.5px] border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Staff Access</h3><p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Invite staff, control access, and review account activity.</p></div><button type="button" onClick={()=>setShowInvite(value=>!value)} className="rounded-lg bg-primary px-3 py-2 text-[13px] font-extrabold text-white"><Plus size={13} className="inline mr-1"/> Add member</button></div>
      {showInvite && <form onSubmit={invite} className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-4"><label className="text-[12px] font-bold text-slate-500">NAME<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"/></label><label className="text-[12px] font-bold text-slate-500">EMAIL<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"/></label><label className="text-[12px] font-bold text-slate-500">ROLE<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"><option value="quotes">Quotations</option><option value="admin">Administrator</option><option value="custom">Custom access</option></select></label><div className="flex items-end gap-2"><button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Send invitation</button><button type="button" onClick={()=>setShowInvite(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">Cancel</button></div>{form.role==='custom' && <div className="md:col-span-4 flex flex-wrap gap-2">{permissions.map(permission=><label key={permission} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold"><input type="checkbox" checked={form.permissions.includes(permission)} onChange={e=>setForm({...form,permissions:e.target.checked?[...form.permissions,permission]:form.permissions.filter(item=>item!==permission)})}/>{STAFF_PERMISSION_LABELS[permission]||permission}</label>)}</div>}</form>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-900"><tr><th className="p-3">Member</th><th>Access</th><th>Status</th><th>Last active</th><th>Usage</th></tr></thead><tbody>{staff.map(member=><tr key={member.id} role="button" tabIndex={0} onClick={()=>setSelected(member)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setSelected(member)}} className="cursor-pointer border-t border-slate-100 text-xs hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:border-slate-700 dark:hover:bg-slate-800"><td className="p-3"><strong className="block text-slate-900 dark:text-white">{member.name}</strong><span className="text-[12px] text-slate-500">{member.email}</span></td><td className="capitalize">{member.role}</td><td><span className={`rounded-full px-2 py-1 text-[11px] font-extrabold uppercase ${member.status==='active'?'bg-emerald-50 text-emerald-700':member.status==='suspended'?'bg-red-50 text-red-700':'bg-amber-50 text-amber-700'}`}>{member.status}</span></td><td>{formatDate(member.lastActiveAt)}</td><td>{formatSeconds(Number(member.usageByDate?.[today]?.minutes||0)*60+Number(member.usageByDate?.[today]?.seconds||0)+(member.sessionLastSeenAt&&clock-new Date(member.sessionLastSeenAt).getTime()<15000?Math.max(0,Math.floor((clock-new Date(member.sessionLastSeenAt).getTime())/1000)):0))}</td></tr>)}</tbody></table>{staff.length===0&&<p className="p-6 text-center text-xs text-slate-500">No staff accounts found.</p>}</div>
    </section>
    {selected && typeof document !== 'undefined' && createPortal(<div className="fixed inset-0 z-[10000] bg-slate-950/35" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100"><header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div><h2 className="font-extrabold text-slate-900 dark:text-white">{selected.name}</h2><p className="text-xs text-slate-500">{selected.email}</p></div><button onClick={()=>setSelected(null)} aria-label="Close activity" className="rounded-lg p-2 text-slate-500"><SvgClose size={17}/></button></header><div className="space-y-5 p-5"><div className="grid grid-cols-2 gap-2">{[['Last login',formatDate(selected.lastLoginAt)],['Usage',formatUsage(selected.usageMinutes)],['Logins',selected.loginCount||0],['Status',selected.status]].map(([label,value])=><div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><span className="block text-[11px] font-bold uppercase text-slate-400">{label}</span><strong className="mt-1 block text-xs capitalize">{value}</strong></div>)}</div>{selected.role!=='owner'&&<><div><label className="text-[12px] font-bold text-slate-500">ACCESS ROLE<select value={selected.role} onChange={e=>setSelected({...selected,role:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"><option value="quotes">Quotations</option><option value="admin">Administrator</option><option value="custom">Custom access</option></select></label>{selected.role==='custom'&&<div className="mt-3 flex flex-wrap gap-2">{permissions.map(permission=><label key={permission} className="flex items-center gap-1 rounded-full border px-2 py-1 text-[12px]"><input type="checkbox" checked={(selected.permissions||[]).includes(permission)} onChange={e=>setSelected({...selected,permissions:e.target.checked?[...(selected.permissions||[]),permission]:(selected.permissions||[]).filter(item=>item!==permission)})}/>{STAFF_PERMISSION_LABELS[permission]}</label>)}</div>}<button disabled={busy} onClick={()=>memberAction(selected,'update',{role:selected.role,permissions:selected.permissions,status:selected.status})} className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Save access</button></div><div className="flex flex-wrap gap-2">{selected.status==='invited'&&<button disabled={busy} onClick={()=>memberAction(selected,'resend')} className="rounded-lg border px-3 py-2 text-xs font-bold">Resend invite</button>}{selected.status==='active'&&<button disabled={busy} onClick={()=>memberAction(selected,'reset')} className="rounded-lg border px-3 py-2 text-xs font-bold">Send password reset</button>}<button disabled={busy} onClick={()=>memberAction(selected,'update',{status:selected.status==='suspended'?'active':'suspended'})} className="rounded-lg border px-3 py-2 text-xs font-bold">{selected.status==='suspended'?'Reactivate':'Suspend'}</button><button disabled={busy} onClick={()=>{if(window.confirm(`Remove ${selected.name}?`))memberAction(selected,'remove')}} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Remove</button></div></>}
      <div><h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">Activity by date</h3><div className="mb-3 flex flex-wrap gap-2">{[['today','Today'],['week','7 days'],['month','Month'],['custom','Custom'],['overall','Overall']].map(([value,label])=><button key={value} onClick={()=>setActivityRange(value)} className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${activityRange===value?'bg-primary text-white':'border border-slate-200'}`}>{label}</button>)}</div>{activityRange==='custom'&&<div className="mb-3 grid grid-cols-2 gap-2"><label className="text-[11px] font-bold text-slate-500">FROM<input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="mt-1 w-full rounded-lg border px-2 py-2 text-xs"/></label><label className="text-[11px] font-bold text-slate-500">TO<input type="date" min={dateFrom} value={dateTo} onChange={e=>setDateTo(e.target.value)} className="mt-1 w-full rounded-lg border px-2 py-2 text-xs"/></label></div>}<div className="mb-4 grid grid-cols-2 gap-2"><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><span className="block text-[11px] font-bold uppercase text-slate-400">Usage</span><strong className="mt-1 block text-xs">{formatSeconds(selectedUsage)}</strong></div><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><span className="block text-[11px] font-bold uppercase text-slate-400">Logins</span><strong className="mt-1 block text-xs">{selectedLogins}</strong></div></div><div className="space-y-3">{selectedActivities.map(activity=><div key={activity.id} className="border-l-2 border-primary pl-3"><strong className="block text-xs text-slate-900 dark:text-white">{activity.message}</strong><span className="text-[12px] text-slate-400">{formatDate(activity.createdAt)}</span>{activity.changes?.map((change,index)=><p key={index} className="mt-1 text-[12px] text-slate-500">{prettyField(change.field)}: {describeChange(change)}</p>)}</div>)}{!selectedActivities.length&&<p className="text-xs text-slate-500">No recorded changes for this period.</p>}</div></div></div></aside></div>,document.body)}
  </>;
}

function AdminDashboard({ db, mapsLoaded, backendOnline, onLogout, adminUser }) {
  const fetch = authenticatedFetch;
  // True once there's data to show — either freshly fetched or restored from
  // last session's cache. Separate from `backendOnline`, which only turns true
  // after a real, confirmed round trip (and gates autosave) so cached data can
  // render instantly without pretending the connection is live yet.
  const hasData = Array.isArray(db?.vehicles) && db.vehicles.length > 0;
  const hasPermission = permission => !adminUser?.role || adminUser.role === 'owner' || adminUser.role === 'admin' && permission !== 'staff' || (adminUser.permissions || []).includes(permission);
  const canAccessTab = item => hasPermission(item === 'bookings' ? 'bookings' : item === 'settings' ? (hasPermission('settings') ? 'settings' : 'staff') : item);
  const injectDefaults = (v) => {
    const newV = { ...v };
    // An empty list is an intentional "no fixed overhead" setting. Only
    // recover defaults when the field is genuinely absent.
    if (!Array.isArray(newV.annualFixedCosts)) {
      newV.annualFixedCosts = Array.isArray(newV.annualCosts) && newV.annualCosts.length > 0
        ? newV.annualCosts.map((cost, index) => ({
            id: cost.id ?? index + 1,
            name: cost.name ?? cost.label ?? "",
            amount: Number(cost.amount ?? cost.cost ?? 0)
          }))
        : [
            { id: '1', name: 'Vehicle Excise Duty (VED)', amount: 600 },
            { id: '2', name: 'Annual Insurance', amount: 3200 },
            { id: '3', name: 'Annual Depreciation', amount: 7975 }
          ];
    }
    
    // Always sync standingCostPerDay and ratePerKm with the parameters
    const fcSum = (newV.annualFixedCosts || []).reduce((s, x) => s + (Number(x.amount)||0), 0);
    const utilDays = newV.utilisationDays || 225;
    if (fcSum > 0) {
      if (!newV.standingCostPerDay && fcSum > 0) newV.standingCostPerDay = (fcSum / (Number(newV.fleetCount) || 1)) / utilDays;
    }

    const fuelPrice = newV.fuelPricePerLitre ?? db?.globalVars?.fuelPricePerLitre ?? 1.52;
    const fuelKpl = newV.fuelKpl || 5;
    const fuelPerKm = fuelPrice / fuelKpl;
    const directTyreCost = Number(newV.tyreCostPerKm);
    const tyreSetCost = Number(newV.tyreSetCost);
    const tyreLife = Number(newV.expectedTyreLifeKm);
    const tyrePerKm = directTyreCost > 0 ? directTyreCost : (tyreSetCost > 0 && tyreLife > 0 ? tyreSetCost / tyreLife : 0.05);
    const maintSetCost = Number(newV.maintenanceSetCost);
    const maintLife = Number(newV.expectedMaintenanceLifeKm);
    const maintCost = Number(newV.maintenanceCostPerKm) > 0 ? Number(newV.maintenanceCostPerKm) : (maintSetCost > 0 && maintLife > 0 ? maintSetCost / maintLife : 0.15);
    const vcSum = fuelPerKm + tyrePerKm + maintCost;
    if (vcSum > 0) {
      if (!newV.ratePerKm && vcSum > 0) newV.ratePerKm = vcSum;
    }

    return newV;
  };

  const [tab, setTab]       = useState("dashboard");
  const [settingsSection, setSettingsSection] = useState('company');
  const [darkMode, setDarkMode] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const [featureUsage, setFeatureUsage] = useState(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('adminFeatureUsage') || '{}'); }
    catch { return {}; }
  });

  const recordFeatureUsage = useCallback((key) => {
    setActiveFeature(key);
    setFeatureUsage(current => {
      const previous = current[key] || { count: 0, lastUsed: 0, durationMs: 0 };
      const next = { ...current, [key]: { ...previous, count: previous.count + 1, lastUsed: Date.now() } };
      if (typeof window !== 'undefined') localStorage.setItem('adminFeatureUsage', JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!activeFeature || typeof window === 'undefined') return;
    let lastTick = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      lastTick = now;
      setFeatureUsage(current => {
        const previous = current[activeFeature] || { count: 0, lastUsed: now, durationMs: 0 };
        const next = { ...current, [activeFeature]: { ...previous, durationMs: (previous.durationMs || 0) + elapsed } };
        localStorage.setItem('adminFeatureUsage', JSON.stringify(next));
        return next;
      });
    }, 10000);
    return () => window.clearInterval(timer);
  }, [activeFeature]);

  const frequentFeatures = useMemo(() => {
    const defaultOrder = ['quotations', 'seasonal', 'fleetVariables'];
    return QUICK_ACCESS_FEATURES
    .map((feature, index) => ({ ...feature, index, ...(featureUsage[feature.key] || { count: 0, lastUsed: 0, durationMs: 0 }), defaultIndex: defaultOrder.indexOf(feature.key) }))
    .sort((a, b) => b.count - a.count || b.durationMs - a.durationMs || b.lastUsed - a.lastUsed || (a.defaultIndex < 0 ? 99 : a.defaultIndex) - (b.defaultIndex < 0 ? 99 : b.defaultIndex) || a.index - b.index)
    .slice(0, 3);
  }, [featureUsage]);

  const openFrequentFeature = useCallback((feature) => {
    recordFeatureUsage(feature.key);
    setTab(feature.tab);
    window.setTimeout(() => {
      document.getElementById(feature.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [recordFeatureUsage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("adminTab");
      if (savedTab && canAccessTab(savedTab)) setTab(savedTab);
      else setTab(['dashboard', 'pricing', 'fleet', 'bookings', 'settings'].find(canAccessTab) || 'dashboard');
      const savedSettingsSection = localStorage.getItem("adminSettingsSection");
      if (savedSettingsSection && ['company', 'pricing', 'staff'].includes(savedSettingsSection)) setSettingsSection(savedSettingsSection);
      const savedTheme = localStorage.getItem("adminTheme");
      if (savedTheme === "dark") {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
        document.body.style.backgroundColor = '#0B0F19';
      }
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady && !canAccessTab(tab)) setTab(['dashboard', 'pricing', 'fleet', 'bookings', 'settings'].find(canAccessTab) || 'dashboard');
  }, [adminUser?.role, JSON.stringify(adminUser?.permissions || []), isReady, tab]);

  useEffect(() => {
    if (isReady && typeof window !== "undefined") {
      localStorage.setItem("adminTab", tab);
      localStorage.setItem("adminSettingsSection", settingsSection);
    }
  }, [tab, settingsSection, isReady]);

  useEffect(() => {
    if (isReady && typeof window !== "undefined") {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        document.body.style.backgroundColor = '#0B0F19';
        localStorage.setItem("adminTheme", "dark");
      } else {
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = '#F1F3F5';
        localStorage.setItem("adminTheme", "light");
      }
    }
  }, [darkMode, isReady]);
  const [vehicles, setV]    = useState(db.vehicles.map(injectDefaults));
  const [activeVehicleId, setActiveVehicleId] = useState(vehicles[0]?.id || "");
  const [selectedPricingVehicleId, setSelectedPricingVehicleId] = useState(vehicles[0]?.id || "");
  const [gv, setGv]         = useState({...db.globalVars});
  const [depotLoc, setDepotLoc] = useState({ address: gv.yardAddress || "", lat: gv.yardLat, lng: gv.yardLng });
  const [previewBooking, setPreviewBooking] = useState<any>(null);
  const [quoteDetailTab, setQuoteDetailTab] = useState<'route' | 'costs' | 'customer'>('route');
  useEffect(() => { setQuoteDetailTab('route'); }, [previewBooking?.id]);
  const [overheads, setOH]  = useState(db.annualOverheads.map(o=>({...o})));
  const [roadCharges, setRoadCharges] = useState(() => buildRoadChargeItems(db.surcharges));
  const sr = useMemo(() => roadChargeItemsToMap(roadCharges), [roadCharges]);
  const selectedPricingVehicle = vehicles.find(vehicle => vehicle.id === selectedPricingVehicleId) || vehicles[0];
  const pricing = selectedPricingVehicle?.pricingSettings || {};
  const [operatorDetails, setOperatorDetails] = useState({
    companyName: "",
    operatorLicence: "",
    depotPostcode: "",
    notificationEmail: "",
    ...(db.operatorDetails || {})
  });
  const [blocks, setBl]     = useState([...db.blockedDates]);
  const [newBlock, setNB]   = useState({id:'', vehicleId:db.vehicles[0]?.id || "",from:"",to:"",reason:"Contract booking",units:1});
  
  const blankTemplate = {id:'', pickupArea:"", dropArea:"", vehicleId:db.vehicles[0]?.id, tripType:"one-way", price:0, waitingChargePerHour:0, radiusKm:15};
  const [newTemplate, setNT] = useState(blankTemplate);

  const blankMatrix = {
    id:'', pickupArea:"", dropArea:"", tripType:"one-way", vehicleId:db.vehicles[0]?.id,
    baseFare:0, includedLiveMileage:0, includedDeadMileage:0, waitingChargePerHour:0,
    extraMileageRate:0, nightRateMultiplier:1, weekendRateMultiplier:1, status:'active',
    scope:'global',
    distanceBands:[
      { min:0, max:10, rate:0 },
      { min:10, max:30, rate:0 },
      { min:30, max:60, rate:0 },
      { min:60, max:null, rate:0 }
    ]
  };
  const [newMatrix, setNM] = useState(blankMatrix);

  const blankSeasonal = {
    id:'', name:"Holiday Surge", startDate:"", endDate:"", multiplier:1.2,
    overrideFare:null, priority:1, enabled:true,
    applicableVehicles:['Any'], applicableRoutes:['Any'], status:'active'
  };
  const [newSeasonal, setNS] = useState(blankSeasonal);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [toast, setToast]   = useState("");
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (db) {
      if (db.vehicles) {
        setV(db.vehicles.map(injectDefaults));
        setActiveVehicleId(activeId => {
          if (!activeId || !db.vehicles.some(v => v.id === activeId)) {
            return db.vehicles[0]?.id || "";
          }
          return activeId;
        });
      }
      if (db.globalVars) {
        setGv({...db.globalVars});
        setDepotLoc({ address: db.globalVars.yardAddress || "", lat: db.globalVars.yardLat, lng: db.globalVars.yardLng });
      }
      if (db.annualOverheads) setOH(db.annualOverheads.map(o=>({...o})));
      if (db.surcharges) setRoadCharges(buildRoadChargeItems(db.surcharges));
      if (db.operatorDetails) setOperatorDetails(current => ({...current, ...db.operatorDetails}));
      if (db.blockedDates) setBl([...db.blockedDates]);
      if (db.vehicles && db.vehicles[0]) setNB(nb => ({ ...nb, vehicleId: db.vehicles[0].id }));
    }
  }, [db]);

  const [matrixData, setMatrixData] = useState([]);
  const [templatesData, setTemplatesData] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showMatrixForm, setShowMatrixForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [matrixView, setMatrixView] = useState('global');
  const [seasonalData, setSeasonalData] = useState([]);
  const [bookingsData, setBookingsData] = useState([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoadError, setDashboardLoadError] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [activityPeriod, setActivityPeriod] = useState("monthly");
  const [searchNameRef, setSearchNameRef] = useState("");
  const [searchVehicle, setSearchVehicle] = useState("");
  const [searchFareFrom, setSearchFareFrom] = useState("");
  const [searchFareTo, setSearchFareTo] = useState("");
  const [searchRoute, setSearchRoute] = useState("");
  const settingsApisLoadedRef = useRef(false);
  const bookingsApisLoadedRef = useRef(false);
  const [isBookingsLoading, setIsBookingsLoading] = useState(true);
  const [bookingsLoadError, setBookingsLoadError] = useState("");
  const [bookingsDisplayCount, setBookingsDisplayCount] = useState(100);
  const [showBookingFilters, setShowBookingFilters] = useState(true);
  const [bookingLast30Days, setBookingLast30Days] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [bookingEditForm, setBookingEditForm] = useState<any>(null);
  const [bookingEditError, setBookingEditError] = useState("");
  const [isSavingBooking, setIsSavingBooking] = useState(false);

  const searchResults = useMemo(() => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return [];
    const terms = query.split(/\s+/).filter(Boolean);
    const bookingDestinations = bookingsData.map(booking => ({
      label: `#${booking.id} · ${booking.customer?.name || "Unnamed customer"}`,
      description: `${booking.journey?.origin || "Origin not set"} → ${booking.journey?.destination || "Destination not set"}`,
      tab: 'bookings', target: 'quotation-workspace', feature: 'quotations', booking,
      keywords: [booking.id, booking.status, booking.customer?.name, booking.customer?.email, booking.customer?.phone, booking.journey?.origin, booking.journey?.destination, booking.quote?.vehicle?.name].filter(Boolean).join(' ')
    }));
    const vehicleDestinations = vehicles.map(vehicle => ({
      label: vehicle.name || 'Vehicle',
      description: `${vehicle.capacity || 0} seats · Fleet variables`,
      tab: 'fleet', target: 'fleet-variables', feature: 'fleetVariables',
      keywords: Object.values(vehicle).join(' ')
    }));
    return [...ADMIN_SEARCH_DESTINATIONS, ...bookingDestinations, ...vehicleDestinations]
      .map((item, index) => {
        const searchable = `${item.label} ${item.description} ${item.keywords || ''}`.toLowerCase();
        const score = terms.reduce((total, term) => total +
          (item.label.toLowerCase().startsWith(term) ? 4 : searchable.includes(term) ? 1 : -20), 0);
        return { ...item, index, score };
      })
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 8);
  }, [globalSearch, bookingsData, vehicles]);

  const openSearchDestination = useCallback((destination) => {
    if (destination.feature) recordFeatureUsage(destination.feature);
    if (destination.booking) setPreviewBooking(destination.booking);
    if (destination.settingsSection) setSettingsSection(destination.settingsSection);
    setTab(destination.tab);
    setGlobalSearch('');
    setSearchOpen(false);
    if (destination.target) {
      window.setTimeout(() => document.getElementById(destination.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }, [recordFeatureUsage]);

  const refreshDashboardData = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/dashboard`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to load dashboard metrics");
      setDashboardData(payload);
      setDashboardLoadError("");
    } catch (error: any) {
      setDashboardLoadError(error.message || "Unable to load dashboard metrics");
    }
  }, []);

  useEffect(() => {
    if (!editingBooking) return;
    const closeOnEscape = event => {
      if (event.key === "Escape" && !isSavingBooking) closeBookingEditor();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editingBooking, isSavingBooking]);

  const openBookingEditor = (booking: any) => {
    setEditingBooking(booking);
    setBookingEditForm({
      customerName: booking.customer?.name || "",
      customerEmail: booking.customer?.email || "",
      customerPhone: booking.customer?.phone || "",
      customerCompany: booking.customer?.company || "",
      status: String(booking.status || "draft").toLowerCase(),
      specialRequests: booking.journey?.specialRequests || ""
    });
    setBookingEditError("");
  };

  const closeBookingEditor = () => {
    if (isSavingBooking) return;
    setEditingBooking(null);
    setBookingEditForm(null);
    setBookingEditError("");
  };

  const saveBookingEdits = async (event: any) => {
    event.preventDefault();
    if (!editingBooking || !bookingEditForm) return;
    if (!bookingEditForm.customerName.trim() || !bookingEditForm.customerEmail.trim()) {
      setBookingEditError("Customer name and email are required.");
      return;
    }

    const updatedBooking = {
      ...editingBooking,
      customer: {
        ...(editingBooking.customer || {}),
        name: bookingEditForm.customerName.trim(),
        email: bookingEditForm.customerEmail.trim(),
        phone: bookingEditForm.customerPhone.trim(),
        company: bookingEditForm.customerCompany.trim()
      },
      journey: {
        ...(editingBooking.journey || {}),
        name: bookingEditForm.customerName.trim(),
        email: bookingEditForm.customerEmail.trim(),
        phone: bookingEditForm.customerPhone.trim(),
        company: bookingEditForm.customerCompany.trim(),
        specialRequests: bookingEditForm.specialRequests.trim()
      },
      status: bookingEditForm.status
    };

    setIsSavingBooking(true);
    setBookingEditError("");
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/bookings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedBooking)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to update this quotation.");
      const savedBooking = payload.booking || updatedBooking;
      setBookingsData(current => current.map(booking => booking.id === savedBooking.id ? savedBooking : booking));
      setPreviewBooking(savedBooking);
      setEditingBooking(null);
      setBookingEditForm(null);
      setToast(`Quotation #${savedBooking.id} updated.`);
      if (editingBooking.status !== 'sent' && updatedBooking.status === 'sent') {
        fetch('/api/send-customer-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking: savedBooking })
        }).catch(console.error);
      }
      setTimeout(() => setToast(""), 2500);
    } catch (error: any) {
      setBookingEditError(error.message || "Unable to update this quotation.");
    } finally {
      setIsSavingBooking(false);
    }
  };

  useEffect(() => {
    if (tab === 'pricing' && !settingsApisLoadedRef.current) {
      settingsApisLoadedRef.current = true;
      authenticatedFetch(API_BASE_URL + '/api/admin/pricing-matrix').then(r=>{if(!r.ok)throw new Error('Unable to load pricing matrices');return r.json();}).then(m => setMatrixData(Array.isArray(m) ? m : [])).catch(()=>{});
      authenticatedFetch(API_BASE_URL + '/api/admin/route-templates').then(r=>{if(!r.ok)throw new Error('Unable to load route templates');return r.json();}).then(t => setTemplatesData(Array.isArray(t) ? t : [])).catch(()=>{});
      authenticatedFetch(API_BASE_URL + '/api/admin/seasonal').then(r=>{if(!r.ok)throw new Error('Unable to load seasonal rules');return r.json();}).then(s => setSeasonalData(Array.isArray(s) ? s : [])).catch(()=>{});
    }
    if (tab === 'bookings' && !bookingsApisLoadedRef.current) {
      bookingsApisLoadedRef.current = true;
      authenticatedFetch(API_BASE_URL + '/api/bookings').then(r=>{if(!r.ok)throw new Error('Unable to load bookings');return r.json();}).then(b => {
        setBookingsData(b.bookings && Array.isArray(b.bookings) ? b.bookings : []);
        setBookingsLoadError("");
        setIsBookingsLoading(false);
      }).catch((error)=>{
        // Keep the last successful result on transient failures. Replacing it
        // with [] made the dashboard look as though backend data was deleted.
        setBookingsLoadError(error.message || "Unable to load quotations");
        setIsBookingsLoading(false);
      });
    }
  }, [tab]);

  useEffect(() => {
    refreshDashboardData();
    const interval = setInterval(refreshDashboardData, 10000);
    return () => clearInterval(interval);
  }, [refreshDashboardData]);

  useEffect(() => {
    if (tab !== 'bookings') return;
    const refreshBookings = () => {
      authenticatedFetch(API_BASE_URL + '/api/bookings')
        .then(r => { if (!r.ok) throw new Error('Unable to refresh bookings'); return r.json(); })
        .then(b => {
          if (b.bookings && Array.isArray(b.bookings)) {
            setBookingsData(b.bookings);
            setBookingsLoadError("");
          }
        })
        .catch((error) => setBookingsLoadError(error.message || "Unable to refresh quotations"));
    };
    const interval = setInterval(refreshBookings, 10000);
    return () => clearInterval(interval);
  }, [tab]);

  const filteredBookingsData = useMemo(() => {
    let list = bookingsData;
    if (bookingLast30Days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      list = list.filter(b => new Date(b.createdAt) >= cutoff);
    }
    if (reportDate) {
      const rd = new Date(reportDate);
      list = list.filter(b => {
        const bd = new Date(b.createdAt);
        return bd.getFullYear() === rd.getFullYear() && bd.getMonth() === rd.getMonth() && bd.getDate() === rd.getDate();
      });
    }
    if (searchNameRef) {
      const q = searchNameRef.toLowerCase().trim();
      list = list.filter(b => 
        String(b.id || '').toLowerCase().includes(q) ||
        String(b.customer?.name || '').toLowerCase().includes(q) ||
        String(b.customer?.email || '').toLowerCase().includes(q) ||
        String(b.customer?.phone || '').toLowerCase().includes(q) ||
        String(b.customer?.company || '').toLowerCase().includes(q)
      );
    }
    if (searchVehicle) {
      const q = searchVehicle.toLowerCase().trim();
      list = list.filter(b => 
        String(b.quote?.vehicle?.name || '').toLowerCase().includes(q)
      );
    }
    if (searchFareFrom || searchFareTo) {
      const fromVal = searchFareFrom !== "" ? parseFloat(searchFareFrom) : null;
      const toVal   = searchFareTo   !== "" ? parseFloat(searchFareTo)   : null;
      list = list.filter(b => {
        const fare = Number(b.quote?.result?.finalPrice || b.quote?.result?.finalFare || 0);
        // Exact match: only From is filled and To is empty
        if (fromVal !== null && toVal === null) return Math.round(fare) === Math.round(fromVal);
        // Range: both filled
        if (fromVal !== null && toVal !== null) return fare >= fromVal && fare <= toVal;
        // Only To filled: fares up to that amount
        if (fromVal === null && toVal !== null) return fare <= toVal;
        return true;
      });
    }
    if (searchRoute) {
      const q = searchRoute.toLowerCase().trim();
      list = list.filter(b => 
        String(b.journey?.origin || '').toLowerCase().includes(q) ||
        String(b.journey?.destination || '').toLowerCase().includes(q)
      );
    }
    
    // Sort the list so it's not random
    let sortedList = [...list];
    if (searchFareFrom || searchFareTo) {
      // Sort numerically by fare when searching by fare
      sortedList.sort((a, b) => {
        const fareA = Number(a.quote?.result?.finalPrice || a.quote?.result?.finalFare || 0);
        const fareB = Number(b.quote?.result?.finalPrice || b.quote?.result?.finalFare || 0);
        return fareA - fareB;
      });
    } else {
      // Sort chronologically by date (newest first) otherwise
      sortedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return sortedList;
  }, [bookingsData, bookingLast30Days, reportDate, searchNameRef, searchVehicle, searchFareFrom, searchFareTo, searchRoute]);

  const fleetOverheadTotals = useMemo(() => {
    const totalOverheads = (db.annualOverheads || []).reduce((sum, item) => sum + Number(item.cost || 0), 0);
    const totalFleetUnits = (db.vehicles || []).reduce((sum, v) => sum + (Number(v.fleetCount) || 0), 0);
    return { totalOverheads, totalFleetUnits };
  }, [db.annualOverheads, db.vehicles]);

  const exportBookingsToCSV = async () => {
    try {
    const [{ default: ExcelJS }, fileSaver] = await Promise.all([
      import('exceljs'),
      import('file-saver')
    ]);
    const saveAs = fileSaver.saveAs || fileSaver.default;
    const unit = gv?.distanceUnit === 'miles' ? 'mile' : 'km';
    const headers = [
      "Booking ID", "Date", "Customer Name", "Email", "Phone", "Company",
      "Origin", "Destination", "Trip Type", "Vehicle Name", "Passengers",
      "Handbags", "Suitcases 23kg", "Distance Unit",
      `Live Mileage (${unit}s)`, `Dead Mileage (${unit}s)`, `Total Mileage (${unit}s)`,
      "Est. Driving Hours", "Waiting Time (mins)", "Total Shift Hours", "Dual Crew?", "Operation Days",
      "Base Standing Cost (£/day)", "Total Standing Cost (£)",
      "Overhead Allocation (£/day)", "Total Overhead Cost (£)",
      "Min Daily Hire Charge (£/day)", "Total Min Hire (£)",
      "Fuel Price (£/litre)", "Fuel Consumption (kpl)", "Total Fuel Cost (£)",
      `Tyre Cost (£/${unit})`, "Total Tyre Cost (£)",
      `Maintenance Cost (£/${unit})`, "Total Maintenance Cost (£)",
      "Total Variable Cost (£)", "Driver Hourly Wage (£/hr)", "Holiday Pay (%)", "Total Driver Cost (£)",
      "London ULEZ Surcharge (£)", "Birmingham CAZ Surcharge (£)",
      "Dartford Crossing Surcharge (£)", "M6 Toll Surcharge (£)", "Driver Subsistence (£)",
      "Total Surcharges (£)", "Target Profit Margin (%)", "Target Profit Margin (£)", "Seasonal Multiplier",
      "Subtotal (£)", "Total Fare (£)",
      "Gross Profit (£)", "Gross Margin (%)",
      "Net Profit (£)", "Net Margin (%)"
    ];

    const rows = filteredBookingsData.map((b, index) => {
      const vehicle = b.quote?.vehicle || db.vehicles.find(v => v.id === b.journey?.vehicleId) || db.vehicles[0] || {};
      const result = b.quote?.result || {};
      
      const ulezCost = result.surchargeLines?.find(s => s.label.toLowerCase().includes("ulez"))?.cost || 0;
      const cazCost = result.surchargeLines?.find(s => s.label.toLowerCase().includes("birmingham"))?.cost || 0;
      const dartfordCost = result.surchargeLines?.find(s => s.label.toLowerCase().includes("dartford"))?.cost || 0;
      const m6TollCost = result.surchargeLines?.find(s => s.label.toLowerCase().includes("m6"))?.cost || 0;
      const subsistenceCost = result.surchargeLines?.find(s => s.label.toLowerCase().includes("subsistence"))?.cost || 0;

      const liveKm = result.revenueKm || 0;
      const totalKm = result.totalKm || 0;
      const deadKm = Math.max(0, totalKm - liveKm);

      const fuelPrice = vehicle.fuelPricePerLitre ?? db.globalVars?.fuelPricePerLitre ?? 1.52;
      const fuelKpl = vehicle.fuelKpl || 5;
      const fuelPerKm = fuelPrice / fuelKpl;
      const calculatedTyreCost =
        Number(vehicle.tyreSetCost) > 0 && Number(vehicle.expectedTyreLifeKm) > 0
          ? Number(vehicle.tyreSetCost) / Number(vehicle.expectedTyreLifeKm)
          : 0.05;
      const tyreCost = vehicle.tyreCostPerKm || calculatedTyreCost;
      const calculatedMaintCost = Number(vehicle.maintenanceSetCost) > 0 && Number(vehicle.expectedMaintenanceLifeKm) > 0
        ? Number(vehicle.maintenanceSetCost) / Number(vehicle.expectedMaintenanceLifeKm)
        : 0.15;
      const maintCost = vehicle.maintenanceCostPerKm || calculatedMaintCost;

      const totalAnnualFixed = (vehicle.annualCosts||[]).reduce((s,c)=>s+Number(c.cost),0);
      const fleetCount = vehicle.fleetCount || 1;
      const annualFixed = totalAnnualFixed / fleetCount;
      const rStanding = (vehicle.utilisationDays || 225) > 0 ? annualFixed / (vehicle.utilisationDays || 225) : 0;
      const dailyStanding = rStanding;

      const companyOverheads = db.annualOverheads?.reduce((s,o)=>s+Number(o.cost),0) || 0;
      const totalFleetUnits = db.vehicles?.reduce((s,v)=>s+(Number(v.fleetCount)||1),0) || 1;
      const overheadPerUnit = companyOverheads / totalFleetUnits;
      const dailyOverhead = (vehicle.utilisationDays || 225) > 0 ? overheadPerUnit / (vehicle.utilisationDays || 225) : 0;
      const minDailyHire = rStanding + dailyOverhead;

      const profitMarginPct = vehicle.profitMarginPct ?? db.globalVars?.profitMarginPct ?? 28;

      const driverCost = result.driverCost || 0;
      const driverWage = vehicle.driverHourlyWage ?? db.globalVars?.driverHourlyWage ?? 17.50;
      const holPayPct = vehicle.holidayPayPct ?? db.globalVars?.holidayPayPct ?? 12.07;

      const rNum = index + 2;
      const totalStanding = dailyStanding * (Number(result.opDays) || 1);
      const totalOverhead = dailyOverhead * (Number(result.opDays) || 1);
      const totalMinHire = minDailyHire * (Number(result.opDays) || 1);
      const totalFuel = fuelPerKm * totalKm;
      const totalTyre = tyreCost * totalKm;
      const totalMaintenance = maintCost * totalKm;
      const totalVariable = totalFuel + totalTyre + totalMaintenance;
      const totalSurcharges = ulezCost + cazCost + dartfordCost + m6TollCost + subsistenceCost;
      const subtotalValue = totalStanding + totalVariable + driverCost;
      const targetProfit = (subtotalValue + totalSurcharges) * (profitMarginPct / 100);
      const seasonalMultiplier = Number(b.quote?.result?.seasonalMultiplier || 1);
      const totalFare = seasonalMultiplier > 0
        ? Math.max((subtotalValue + totalSurcharges + targetProfit) * seasonalMultiplier, totalMinHire)
        : subtotalValue + totalSurcharges + targetProfit;
      const grossProfit = totalFare - totalSurcharges - totalVariable - driverCost - subsistenceCost;
      const netProfit = totalFare - totalStanding - totalOverhead;

      return [
        b.id,
        new Date(b.createdAt).toLocaleString("en-GB"),
        b.customer?.name,
        b.customer?.email,
        b.customer?.phone,
        b.customer?.company,
        String(b.journey?.origin || '').split(',')[0],
        String(b.journey?.destination || '').split(',')[0],
        b.journey?.journeyType,
        vehicle.name,
        b.journey?.passengers,
        b.journey?.handbagCount ?? 0,
        b.journey?.suitcaseCount ?? 0,
        gv?.distanceUnit || 'miles',
        Math.round(liveKm),
        Math.round(deadKm),
        `=O${rNum}+P${rNum}`,
        result.totalShiftHrs ? Math.round((result.totalShiftHrs - (Number(b.journey?.waitingMins)||0)/60)*10)/10 : 0,
        Number(b.journey?.waitingMins)||0,
        `=R${rNum}+(S${rNum}/60)`,
        result.dualCrew ? "Yes" : "No",
        result.opDays || 1,
        dailyStanding.toFixed(2),
        `=W${rNum}*V${rNum}`,
        dailyOverhead.toFixed(2),
        `=Y${rNum}*V${rNum}`,
        `=W${rNum}+Y${rNum}`,
        `=AA${rNum}*V${rNum}`,
        fuelPrice.toFixed(2),
        fuelKpl,
        `=(AC${rNum}/AD${rNum})*Q${rNum}`,
        tyreCost.toFixed(2),
        `=AF${rNum}*Q${rNum}`,
        maintCost.toFixed(2),
        `=AH${rNum}*Q${rNum}`,
        `=AE${rNum}+AG${rNum}+AI${rNum}`,
        driverWage.toFixed(2),
        holPayPct,
        `=(AK${rNum}*T${rNum}*V${rNum})*(1+(AL${rNum}/100))*IF(U${rNum}="Yes",2,1)`,
        ulezCost.toFixed(2),
        cazCost.toFixed(2),
        dartfordCost.toFixed(2),
        m6TollCost.toFixed(2),
        subsistenceCost.toFixed(2),
        `=AN${rNum}+AO${rNum}+AP${rNum}+AQ${rNum}+AR${rNum}`,
        profitMarginPct,
        `=(AW${rNum}+AS${rNum})*(AT${rNum}/100)`,
        (b.quote?.result?.seasonalMultiplier || 1).toFixed(2),
        { formula: `IF(AT${rNum}>0,X${rNum}+AJ${rNum}+AM${rNum},${(result.subtotal || 0).toFixed(2)})`, result: subtotalValue },
        { formula: `IF(AT${rNum}>0,IF((AW${rNum}+AS${rNum}+AU${rNum})*AV${rNum}<AB${rNum},AB${rNum},(AW${rNum}+AS${rNum}+AU${rNum})*AV${rNum}),(AW${rNum}+AS${rNum}+AU${rNum})*AV${rNum})`, result: totalFare },
        { formula: `AX${rNum}-AS${rNum}-AJ${rNum}-AM${rNum}-AR${rNum}`, result: grossProfit },
        { formula: `IF(AX${rNum}>0, (AY${rNum}/AX${rNum})*100, 0)`, result: totalFare > 0 ? (grossProfit / totalFare) * 100 : 0 },
        { formula: `AY${rNum}-X${rNum}-Z${rNum}`, result: netProfit },
        { formula: `IF(AX${rNum}>0, (BA${rNum}/AX${rNum})*100, 0)`, result: totalFare > 0 ? (netProfit / totalFare) * 100 : 0 }
      ];
    });

    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties = { calcMode: 'auto', fullCalcOnLoad: true, forceFullCalc: true };
    const sheet = workbook.addWorksheet('Bookings');
    
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    rows.forEach((row, rowIndex) => {
      const addedRow = sheet.addRow(row.map((cell, colIndex) => {
        if (cell && typeof cell === 'object' && 'formula' in cell) {
          return cell;
        }
        if (typeof cell === 'string' && cell.startsWith('=')) {
          return { formula: cell.substring(1) };
        }
        if (typeof cell === 'string' && cell.trim() !== '' && !isNaN(Number(cell))) {
           if (colIndex === 0 || colIndex > 13) {
             return Number(cell);
           }
        }
        return cell;
      }));
      // Keep the visible summary columns populated in viewers that do not
      // calculate Excel formulas on open.
      for (const column of [51, 52, 53, 54]) {
        const formulaCell = row[column - 1];
        if (formulaCell && typeof formulaCell === 'object' && 'result' in formulaCell) {
          addedRow.getCell(column).value = Number.isFinite(Number(formulaCell.result)) ? Number(formulaCell.result) : 0;
        }
      }
      
      if (rowIndex % 2 === 0) {
        addedRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });

    headers.forEach((header, colIndex) => {
      const col = sheet.getColumn(colIndex + 1);
      if (header.includes('(£)')) {
        col.numFmt = '"£"#,##0.00';
      } else if (header.includes('(%)')) {
        col.numFmt = '0.0"%"';
      }
      
      if (header.includes('Gross') || header.includes('Net')) {
        col.eachCell((cell, rowNum) => {
          if (rowNum > 1) { 
            cell.font = { bold: true, color: { argb: 'FF065F46' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; 
          }
        });
      }
      col.width = Math.max(header.length, 12);
    });

    // Live stats dashboard in the same sheet, right of the data — formulas
    // recalc automatically when someone edits a booking row in Excel.
    const colLetter = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
    const lastDataRow = rows.length + 1;
    const cellResult = (cell) => (cell && typeof cell === 'object' && 'result' in cell) ? Number(cell.result) || 0 : Number(cell) || 0;
    const totalFareArr = rows.map(r => cellResult(r[49]));
    const netProfitArr = rows.map(r => cellResult(r[52]));
    const grossMarginArr = rows.map(r => cellResult(r[51]));
    const netMarginArr = rows.map(r => cellResult(r[53]));
    const sum = arr => arr.reduce((s, n) => s + n, 0);
    const avg = arr => arr.length ? sum(arr) / arr.length : 0;

    const dashCol = 56; // BD — one blank column after the last data column (BB)
    sheet.getCell(1, dashCol).value = 'Booking Statistics';
    sheet.getCell(1, dashCol).font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };

    const kpis = [
      ['Total Bookings', `COUNTA(A2:A${lastDataRow})`, rows.length, false],
      ['Total Fare (£)', `SUM(AX2:AX${lastDataRow})`, sum(totalFareArr), true],
      ['Avg Fare per Booking (£)', `AVERAGE(AX2:AX${lastDataRow})`, avg(totalFareArr), true],
      ['Total Net Profit (£)', `SUM(BA2:BA${lastDataRow})`, sum(netProfitArr), true],
      ['Avg Gross Margin (%)', `AVERAGE(AZ2:AZ${lastDataRow})`, avg(grossMarginArr), false],
      ['Avg Net Margin (%)', `AVERAGE(BB2:BB${lastDataRow})`, avg(netMarginArr), false],
    ];
    kpis.forEach(([label, formula, result, isCurrency], i) => {
      const r = 3 + i;
      sheet.getCell(r, dashCol).value = label;
      sheet.getCell(r, dashCol).font = { bold: true, color: { argb: 'FF334155' } };
      const valueCell = sheet.getCell(r, dashCol + 1);
      valueCell.value = { formula, result };
      valueCell.font = { bold: true, color: { argb: 'FF065F46' } };
      valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      valueCell.numFmt = isCurrency ? '"£"#,##0.00' : '0.0"%"';
    });

    const buildBreakdownTable = (startCol, title, catIndex, categories) => {
      const catLetter = colLetter(catIndex + 1);
      const headerRow = 10;
      ['Category', 'Bookings', 'Total Fare (£)', 'Avg Net Margin (%)'].forEach((h, i) => {
        const cell = sheet.getCell(headerRow, startCol + i);
        cell.value = i === 0 ? title : h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      });
      categories.forEach((cat, i) => {
        const r = headerRow + 1 + i;
        let count = 0, fareSum = 0, marginSum = 0;
        rows.forEach(row => { if (row[catIndex] === cat) { count++; fareSum += cellResult(row[49]); marginSum += cellResult(row[53]); } });
        const nameCell = sheet.getCell(r, startCol);
        nameCell.value = cat;
        const countCell = sheet.getCell(r, startCol + 1);
        countCell.value = { formula: `COUNTIF($${catLetter}$2:$${catLetter}$${lastDataRow},${colLetter(startCol)}${r})`, result: count };
        const fareCell = sheet.getCell(r, startCol + 2);
        fareCell.value = { formula: `SUMIF($${catLetter}$2:$${catLetter}$${lastDataRow},${colLetter(startCol)}${r},$AX$2:$AX$${lastDataRow})`, result: fareSum };
        fareCell.numFmt = '"£"#,##0.00';
        const marginCell = sheet.getCell(r, startCol + 3);
        marginCell.value = { formula: `AVERAGEIF($${catLetter}$2:$${catLetter}$${lastDataRow},${colLetter(startCol)}${r},$BB$2:$BB$${lastDataRow})`, result: count ? marginSum / count : 0 };
        marginCell.numFmt = '0.0"%"';
        if (i % 2 === 0) [nameCell, countCell, fareCell, marginCell].forEach(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; });
      });
      if (categories.length) {
        sheet.addConditionalFormatting({
          ref: `${colLetter(startCol + 2)}${headerRow + 1}:${colLetter(startCol + 2)}${headerRow + categories.length}`,
          rules: [{ type: 'dataBar', gradient: false, minLength: 0, maxLength: 100, color: { argb: 'FF34D399' }, cfvo: [{ type: 'min' }, { type: 'max' }] }],
        });
      }
      [0, 1, 2, 3].forEach(i => { sheet.getColumn(startCol + i).width = Math.max(14, title.length); });
    };

    const vehicleNames = [...new Set(rows.map(r => r[9]).filter(Boolean))];
    const tripTypes = [...new Set(rows.map(r => r[8]).filter(Boolean))];
    buildBreakdownTable(dashCol, 'By Vehicle', 9, vehicleNames);
    buildBreakdownTable(dashCol + 5, 'By Trip Type', 8, tripTypes);
    sheet.getColumn(dashCol + 1).width = 20;

    const accountancy = workbook.addWorksheet('Accountancy Breakdown');
    const auditHeaders = [
      'Booking ID','Date','Vehicle','Origin','Destination','Trip Type','Passengers','Distance (km)','Operating Days',
      'Minimum Customer Hire (£)','Quoted Subtotal (£)','Surcharges (£)','Final Net Fare (£)','VAT 20% (£)','Total Inc VAT (£)',
      'Fuel Price (£/L)','Fuel Economy (km/L)','Fuel Cost (£)','Maintenance Rate (£/km)','Maintenance Cost (£)',
      'Tyre Rate (£/km)','Tyre Cost (£)','Driver Cost (£)','Standing Cost (£)','Overnight Cost (£)',
      'Vehicle Fixed Allocation (£)','Company Overhead Allocation (£)','Direct Cost (£)','Accounting Cost (£)',
      'Gross Profit (£)','Gross Margin (%)','Net Profit (£)','Net Margin (%)','Configured Net Margin (%)','Profit Floor (£)'
    ];
    const auditHeader = accountancy.addRow(auditHeaders);
    auditHeader.font = { bold:true, color:{argb:'FFFFFFFF'} };
    auditHeader.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1E293B'} };
    filteredBookingsData.forEach((b, index) => {
      const rowNumber = index + 2;
      const vehicle = b.quote?.vehicle || db.vehicles.find(v=>v.id===b.journey?.vehicleId) || {};
      const result = b.quote?.result || {};
      const bd = result.breakdown || {};
      const distanceKm = Number(result.chargedKm || 0);
      const fuelPrice = Number(vehicle.fuelPricePerLitre ?? db.globalVars?.fuelPricePerLitre ?? 0);
      const fuelEconomy = Number(vehicle.fuelKpl || 0);
      const maintenanceRate = Number(vehicle.maintenanceCostPerKm) || (Number(vehicle.maintenanceSetCost)||0) / Math.max(1,Number(vehicle.expectedMaintenanceLifeKm)||1);
      const tyreRate = Number(vehicle.tyreCostPerKm) || (Number(vehicle.tyreSetCost)||0) / Math.max(1,Number(vehicle.expectedTyreLifeKm)||1);
      const finalFareValue = Number(result.finalPrice || result.finalFare) || 0;
      const driverValue = Number(bd.driverCost ?? result.driverCost) || 0;
      const standingValue = Number(bd.standingCost) || 0;
      const overnightValue = Number(bd.overnightCost) || 0;
      const allocatedStandingValue = Number(bd.allocatedStanding) || 0;
      const allocatedOverheadValue = Number(bd.allocatedOverhead) || 0;
      const surchargeValue = Number(result.surchargeTotal ?? bd.surchargeTotal) || 0;
      const directCostValue = (fuelEconomy > 0 ? distanceKm * fuelPrice / fuelEconomy : 0) + distanceKm * maintenanceRate + distanceKm * tyreRate + driverValue + standingValue + overnightValue + allocatedStandingValue + allocatedOverheadValue + surchargeValue;
      const accountingCostValue = directCostValue + allocatedStandingValue + allocatedOverheadValue;
      accountancy.addRow([
        b.id, new Date(b.createdAt), vehicle.name || '', b.journey?.origin || '', b.journey?.destination || '', b.journey?.journeyType || '', Number(b.journey?.passengers)||0, distanceKm, Number(result.opDays)||1,
        Number(vehicle.minimumHire)||0, Number(result.subtotal)||0, Number(result.surchargeTotal ?? bd.surchargeTotal)||0, Number(result.finalPrice || result.finalFare)||0,
        {formula:`M${rowNumber}*20%`}, {formula:`M${rowNumber}+N${rowNumber}`}, fuelPrice, fuelEconomy,
        {formula:`IF(Q${rowNumber}>0,H${rowNumber}*P${rowNumber}/Q${rowNumber},0)`}, maintenanceRate, {formula:`H${rowNumber}*S${rowNumber}`}, tyreRate, {formula:`H${rowNumber}*U${rowNumber}`},
        Number(bd.driverCost ?? result.driverCost)||0, Number(bd.standingCost)||0, Number(bd.overnightCost)||0, Number(bd.allocatedStanding)||0, Number(bd.allocatedOverhead)||0,
        {formula:`R${rowNumber}+T${rowNumber}+V${rowNumber}+W${rowNumber}+X${rowNumber}+Y${rowNumber}+L${rowNumber}`},
        {formula:`AB${rowNumber}+Z${rowNumber}+AA${rowNumber}`}, {formula:`M${rowNumber}-AB${rowNumber}`, result: finalFareValue - directCostValue}, {formula:`IF(M${rowNumber}>0,AD${rowNumber}/M${rowNumber},0)`, result: finalFareValue > 0 ? (finalFareValue - directCostValue) / finalFareValue : 0},
        {formula:`M${rowNumber}-AC${rowNumber}`, result: finalFareValue - directCostValue}, {formula:`IF(M${rowNumber}>0,AF${rowNumber}/M${rowNumber},0)`, result: finalFareValue > 0 ? (finalFareValue - accountingCostValue) / finalFareValue : 0}, Number(bd.netMarginPct)||0, Number(bd.profitFloor)||0
      ]);
    });
    accountancy.views = [{state:'frozen',ySplit:1}];
    accountancy.autoFilter = {from:'A1',to:`AI${Math.max(1,filteredBookingsData.length+1)}`};
    accountancy.columns.forEach((column,index)=>{ column.width = Math.min(36,Math.max(14,auditHeaders[index]?.length||14)); });
    accountancy.getColumn(2).numFmt = 'dd/mm/yyyy hh:mm';
    for (let column=10; column<=30; column++) accountancy.getColumn(column).numFmt = '£#,##0.00';
    for (const column of [31,33]) accountancy.getColumn(column).numFmt = '0.0%';
    accountancy.getColumn(34).numFmt = '0.0';
    accountancy.getColumn(35).numFmt = '£#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `bookings_${new Date().toISOString().split('T')[0]}.xlsx`);
    setToast(`Exported ${filteredBookingsData.length} quotation${filteredBookingsData.length===1?'':'s'}`);
    } catch (error) {
      setToast(error.message || 'Unable to export quotations');
    }
  };

  const saveApi = useCallback(async (type, item, isDelete=false) => {
    const ep = API_BASE_URL + (type === 'matrix' ? '/api/admin/pricing-matrix' :
               type === 'templates' ? '/api/admin/route-templates' : '/api/admin/seasonal');
    if (isDelete) {
      const response = await authenticatedFetch(`${ep}?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Failed to delete ${type}`);
      return payload;
    } else {
      const isNew = !item.id || item.id.startsWith('new_');
      const res = await authenticatedFetch(ep, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? { ...item, id: undefined } : item)
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Failed to save ${type}`);
      return payload;
    }
  }, []);

  const downloadCsv = (filename, headers, rows) => {
    const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  const exportPricingConfiguration = () => {
    const payload = { exportedAt: new Date().toISOString(), routeTemplates: templatesData, seasonalRules: seasonalData, pricingMatrix: matrixData, blockedDates: blocks };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `pricing-configuration-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  const normalizedVehicles = useMemo(() => vehicles.map(vehicle => {
    const sanitized = (vehicle.annualFixedCosts || []).map((cost, index) => ({
      id: cost.id ?? index + 1,
      label: cost.name || cost.label || "Unnamed Cost",
      cost: Number(cost.amount ?? cost.cost ?? 0)
    }));
    return { ...vehicle, annualCosts: sanitized, annualFixedCosts: sanitized };
  }), [vehicles]);

  const configurationSnapshot = useMemo(() => ({
    globalVars: { ...gv, yardAddress: depotLoc.address, yardLat: depotLoc.lat, yardLng: depotLoc.lng },
    annualOverheads: overheads,
    surcharges: sr,
    vehicles: normalizedVehicles,
    blockedDates: blocks,
    operatorDetails
  }), [gv, depotLoc, overheads, sr, normalizedVehicles, blocks, operatorDetails]);

  const autosaveTimerRef = useRef(null);
  const autosaveRevisionRef = useRef(0);
  const autosaveSavedRevisionRef = useRef(0);
  const autosaveInFlightRef = useRef(false);
  const latestConfigurationRef = useRef(configurationSnapshot);
  const initialConfigurationRef = useRef(JSON.stringify(configurationSnapshot));

  const flushAutosave = useCallback(async () => {
    if (autosaveInFlightRef.current || !backendOnline) return;
    autosaveInFlightRef.current = true;
    try {
      while (autosaveSavedRevisionRef.current < autosaveRevisionRef.current) {
        const revision = autosaveRevisionRef.current;
        const payload = latestConfigurationRef.current;
        const response = await authenticatedFetch(API_BASE_URL + '/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const responsePayload = await response.json().catch(() => ({})); if (!response.ok) console.error('AutoSave failed:', responsePayload);
        if (!response.ok) throw new Error(responsePayload.error || 'Failed to auto-save configuration');
        autosaveSavedRevisionRef.current = revision;
      }
    } catch (error) {
      setToast(error.message || 'Unable to auto-save changes');
      setTimeout(() => setToast(''), 4000);
    } finally {
      autosaveInFlightRef.current = false;
    }
  }, [backendOnline]);

  useEffect(() => {
    latestConfigurationRef.current = configurationSnapshot;
    if (!backendOnline || (autosaveRevisionRef.current === 0 && JSON.stringify(configurationSnapshot) === initialConfigurationRef.current)) return;
    autosaveRevisionRef.current += 1;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(flushAutosave, 300);
  }, [configurationSnapshot, backendOnline, flushAutosave]);

  useEffect(() => { const handleBeforeUnload = () => { if (autosaveTimerRef.current) { clearTimeout(autosaveTimerRef.current); flushAutosave(); } }; window.addEventListener('beforeunload', handleBeforeUnload); return () => { window.removeEventListener('beforeunload', handleBeforeUnload); if (autosaveTimerRef.current) { clearTimeout(autosaveTimerRef.current); flushAutosave(); } }; }, [flushAutosave]);

  const updateDepotLocation = async (address, coords) => {
    const hasCoordinates = Number.isFinite(coords?.lat) && Number.isFinite(coords?.lng);
    const nextLocation = {
      address,
      lat: hasCoordinates ? Number(coords.lat) : undefined,
      lng: hasCoordinates ? Number(coords.lng) : undefined
    };

    setDepotLoc(nextLocation);
    if (!hasCoordinates) return;

    const depotUpdate = {
      yardAddress: address,
      yardLat: nextLocation.lat,
      yardLng: nextLocation.lng
    };

    setGv(current => ({ ...current, ...depotUpdate }));

    try {
      const response = await authenticatedFetch(API_BASE_URL + '/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalVars: depotUpdate })
      });
      if (!response.ok) throw new Error('Failed to save depot location');
      setToast('Depot location saved');
    } catch {
      setToast('Unable to save depot location');
    } finally {
      setTimeout(() => setToast(''), 2500);
    }
  };

  const updateV = (id,field,val) =>
    setV(vs=>vs.map(v=>v.id===id?{...v,[field]:isNaN(Number(val))?val:Number(val)}:v));
  const updatePricing = (field, value) => setV(vs => vs.map(v => v.id === selectedPricingVehicle?.id
    ? { ...v, pricingSettings: { ...(v.pricingSettings || {}), [field]: value } } : v));
  const updateRoadCharges = (next) => {
    setRoadCharges(rows => {
      const value = typeof next === 'function' ? next(rows) : next;
      setV(vs => vs.map(v => v.id === selectedPricingVehicle?.id ? { ...v, pricingSurcharges: roadChargeItemsToMap(value) } : v));
      return value;
    });
  };
  useEffect(() => {
    const vehicle = vehicles.find(v => v.id === selectedPricingVehicleId) || vehicles[0];
    setRoadCharges(buildRoadChargeItems(vehicle?.pricingSurcharges || db.surcharges));
  }, [selectedPricingVehicleId, vehicles, db.surcharges]);

  const handleUnitChange = async (e) => {
    const newUnit = e.target.value;
    const oldUnit = gv.distanceUnit || 'miles';
    if (newUnit === oldUnit) return;

    const isToMiles = newUnit === 'miles';
    const distFactor = isToMiles ? 0.621371 : 1.60934;
    const rateFactor = isToMiles ? 1.60934 : 0.621371;

    const convert = (value, factor, decimals) => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return value;
      const precision = 10 ** decimals;
      return Math.round(numericValue * factor * precision) / precision;
    };

    const nextGlobalVars = { ...gv, distanceUnit: newUnit };
    const nextTemplates = templatesData.map(t => ({
      ...t,
      radiusKm: convert(t.radiusKm, distFactor, 1)
    }));
    const nextMatrix = matrixData.map(m => ({
      ...m,
      radiusKm: convert(m.radiusKm, distFactor, 1),
      extraMileageRate: convert(m.extraMileageRate, rateFactor, 2),
      distanceBands: Array.isArray(m.distanceBands)
        ? m.distanceBands.map(band => ({
            ...band,
            min: convert(band.min, distFactor, 1),
            max: band.max == null ? null : convert(band.max, distFactor, 1),
            rate: convert(band.rate, rateFactor, 2)
          }))
        : m.distanceBands
    }));
    const nextVehicles = vehicles;

    setGv(nextGlobalVars);
    setTemplatesData(nextTemplates);
    setMatrixData(nextMatrix);
    setV(nextVehicles);

    try {
      const configResponse = await authenticatedFetch(API_BASE_URL + '/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalVars: { distanceUnit: newUnit }, vehicles: nextVehicles })
      });
      if (!configResponse.ok) throw new Error('Failed to save distance unit');
      await Promise.all([
        ...nextTemplates.filter(item => item.id).map(item => saveApi('templates', item)),
        ...nextMatrix.filter(item => item.id).map(item => saveApi('matrix', item))
      ]);
      setToast(`Distance unit changed to ${newUnit === 'miles' ? 'miles' : 'kilometers'}`);
    } catch {
      setToast('Unable to update distance unit');
    } finally {
      setTimeout(() => setToast(''), 2500);
    }
  };

  const previewDb  = { ...db, globalVars:gv, annualOverheads:overheads, vehicles };
  
  const [eco, setEco] = useState({ companyOverheads: 0, totalFleetUnits: 1, vehicleBreakdown: [], grandTotal: 0, overheadPerUnit: 0 });
  useEffect(() => {
    if (tab !== 'fleet') return;
    const delayDebounce = setTimeout(() => {
      authenticatedFetch(API_BASE_URL + '/api/admin/economics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewDb)
      }).then(r=>r.json()).then(data => { if(data && data.companyOverheads !== undefined) setEco(data); }).catch(()=>{});
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [previewDb, tab]);

  const totalOverheads = overheads.reduce((s,o)=>s+Number(o.cost),0);
  const distanceUnitShort = gv?.distanceUnit === 'miles' ? 'mi' : 'km';
  const distanceUnitWord = gv?.distanceUnit === 'miles' ? 'mile' : 'km';
  const matrixBands = matrix => Array.isArray(matrix?.distanceBands) && matrix.distanceBands.length === 4
    ? matrix.distanceBands
    : matrix?.id ? [] : blankMatrix.distanceBands;
  const pricingSaveInFlightRef = useRef(false);
  const showSaveError = error => {
    setToast(error?.message || 'Unable to save pricing rule.');
    setTimeout(() => setToast(''), 4000);
  };
  const saveSeasonalRule = async () => {
    const hasOverride = newSeasonal.overrideFare !== null && newSeasonal.overrideFare !== undefined && newSeasonal.overrideFare !== '';
    const validPrice = hasOverride
      ? Number.isFinite(Number(newSeasonal.overrideFare)) && Number(newSeasonal.overrideFare) >= 0
      : Number.isFinite(Number(newSeasonal.multiplier)) && Number(newSeasonal.multiplier) > 0;
    if (!newSeasonal.startDate || !newSeasonal.endDate || new Date(newSeasonal.endDate) < new Date(newSeasonal.startDate) || !validPrice) {
      setToast('Enter a valid date range and either a positive multiplier or override fare.');
      return;
    }
    if (pricingSaveInFlightRef.current) return setToast('A pricing rule is already saving.');
    pricingSaveInFlightRef.current = true;
    try {
      const saved = await saveApi('seasonal', newSeasonal);
      setSeasonalData(current => current.some(rule => rule.id === saved.id)
        ? current.map(rule => rule.id === saved.id ? saved : rule)
        : [saved, ...current]);
      setNS(blankSeasonal);
      setToast('Seasonal rule saved.');
      setTimeout(() => setToast(''), 2500);
    } catch (error) {
      showSaveError(error);
    } finally {
      pricingSaveInFlightRef.current = false;
    }
  };
  const saveMatrixRule = async () => {
    const bands = matrixBands(newMatrix);
    if (newMatrix.baseFare < 0 || bands.some(band => !Number.isFinite(Number(band.rate)) || Number(band.rate) < 0)) {
      return setToast('A valid base fare and all four distance-band rates are required.');
    }
    if (matrixView !== 'global' && !newMatrix.vehicleId) return setToast('A target vehicle is required.');
    if (matrixView === 'city' && (!newMatrix.pickupArea || !newMatrix.dropArea)) return setToast('From and to cities are required.');
    if (pricingSaveInFlightRef.current) return setToast('A pricing rule is already saving.');
    pricingSaveInFlightRef.current = true;
    try {
      const saved = await saveApi('matrix', { ...newMatrix, distanceBands: bands, scope: matrixView, id: newMatrix.id || `new_${Date.now()}` });
      setMatrixData(current => current.some(rule => rule.id === saved.id)
        ? current.map(rule => rule.id === saved.id ? saved : rule)
        : [saved, ...current]);
      setNM(blankMatrix);
      setShowMatrixForm(false);
      setToast('Matrix rule saved.');
      setTimeout(() => setToast(''), 2500);
    } catch (error) {
      showSaveError(error);
    } finally {
      pricingSaveInFlightRef.current = false;
    }
  };

  const pricingAutosaveTimerRef = useRef(null);
  const pricingAutosaveQueueRef = useRef(Promise.resolve());
  useEffect(() => {
    const drafts = [];
    const isExisting = id => id && !String(id).startsWith('new_');

    if (showTemplateForm && isExisting(newTemplate.id) && newTemplate.pickupArea && newTemplate.dropArea && newTemplate.vehicleId &&
      Number(newTemplate.price) >= 0 && Number(newTemplate.radiusKm) >= 0 && Number(newTemplate.waitingChargePerHour) >= 0) {
      drafts.push({ type: 'templates', item: newTemplate });
    }

    const bands = matrixBands(newMatrix);
    if (showMatrixForm && isExisting(newMatrix.id) && bands.length === 4 && Number(newMatrix.baseFare) >= 0 &&
      bands.every(band => Number(band.rate) >= 0) && (matrixView === 'global' || newMatrix.vehicleId) &&
      (matrixView !== 'city' || (newMatrix.pickupArea && newMatrix.dropArea))) {
      drafts.push({ type: 'matrix', item: { ...newMatrix, distanceBands: bands, scope: matrixView } });
    }

    const hasOverride = newSeasonal.overrideFare !== null && newSeasonal.overrideFare !== undefined && newSeasonal.overrideFare !== '';
    const seasonalPriceValid = hasOverride ? Number(newSeasonal.overrideFare) >= 0 : Number(newSeasonal.multiplier) > 0;
    if (isExisting(newSeasonal.id) && newSeasonal.startDate && newSeasonal.endDate &&
      new Date(newSeasonal.endDate) >= new Date(newSeasonal.startDate) && seasonalPriceValid) {
      drafts.push({ type: 'seasonal', item: newSeasonal });
    }

    if (!drafts.length) return;
    if (pricingAutosaveTimerRef.current) clearTimeout(pricingAutosaveTimerRef.current);
    pricingAutosaveTimerRef.current = setTimeout(() => {
      pricingAutosaveQueueRef.current = pricingAutosaveQueueRef.current.then(async () => {
        for (const draft of drafts) {
          const saved = await saveApi(draft.type, draft.item);
          if (draft.type === 'templates') setTemplatesData(current => current.map(rule => rule.id === saved.id ? saved : rule));
          if (draft.type === 'matrix') setMatrixData(current => current.map(rule => rule.id === saved.id ? saved : rule));
          if (draft.type === 'seasonal') setSeasonalData(current => current.map(rule => rule.id === saved.id ? saved : rule));
        }
      }).catch(error => {
        showSaveError(error);
      });
    }, 300);
    return () => clearTimeout(pricingAutosaveTimerRef.current);
  }, [showTemplateForm, newTemplate, showMatrixForm, newMatrix, matrixView, newSeasonal, saveApi]);

  const inferMatrixScope = matrix => ['global','fleet','city'].includes(matrix?.scope) ? matrix.scope : 'invalid';
  const matrixRulesForView = matrixData.filter(matrix => inferMatrixScope(matrix) === matrixView);
  const invalidMatrixRules = matrixData.filter(matrix => inferMatrixScope(matrix) === 'invalid' || matrixBands(matrix).length !== 4);
  const matrixHeaderBands = matrixBands(matrixRulesForView[0] || blankMatrix);
  const dashboardMetrics = useMemo(() => {
    const validBookings = bookingsData
      .filter(booking => !Number.isNaN(new Date(booking.createdAt).getTime()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const daily = Array.isArray(dashboardData?.activity?.daily) ? dashboardData.activity.daily : [];
    const weekly = Array.isArray(dashboardData?.activity?.weekly) ? dashboardData.activity.weekly : [];
    const monthly = Array.isArray(dashboardData?.activity?.monthly) ? dashboardData.activity.monthly : [];
    const activity = activityPeriod === "daily"
      ? {
          labels: ["00–03", "04–07", "08–11", "12–15", "16–19", "20–23"],
          counts: Array.from({ length: 6 }, (_, bucket) => daily
            .slice(bucket * 4, bucket * 4 + 4)
            .reduce((sum, item) => sum + Number(item.bookingCount || 0), 0))
        }
      : activityPeriod === "weekly" ? {
          labels: weekly.map(item => new Date(`${item.date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })),
          counts: weekly.map(item => Number(item.bookingCount || 0))
        }
      : {
          labels: monthly.map(item => new Date(`${item.month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })),
          counts: monthly.map(item => Number(item.bookingCount || 0))
        };
    const todayValue = daily.reduce((sum, item) => sum + Number(item.quotedValue || 0), 0);
    const todayCount = daily.reduce((sum, item) => sum + Number(item.bookingCount || 0), 0);
    const localQuotedValue = bookingsData.reduce((sum, booking) => sum + Number(
      booking.quote?.result?.finalPrice ?? booking.quote?.finalPrice ?? booking.finalPrice ?? booking.totalFare ?? booking.fare ?? 0
    ), 0);
    const backendQuoteGroups = Array.isArray(dashboardData?.financial?.byVehicle)
      ? dashboardData.financial.byVehicle
      : [];
    const localQuoteGroups = Array.from(bookingsData.reduce((groups, booking) => {
      const name = booking.quote?.vehicle?.name || "Unassigned";
      const value = Number(booking.quote?.result?.finalPrice ?? booking.quote?.finalPrice ?? booking.finalPrice ?? booking.totalFare ?? booking.fare ?? 0);
      groups.set(name, (groups.get(name) || 0) + value);
      return groups;
    }, new Map()).entries()).map(([name, quotedValue]) => ({ name, quotedValue }));
    const quoteValueByVehicle = (backendQuoteGroups.length ? backendQuoteGroups : localQuoteGroups)
      .map(item => [item.name || "Unassigned", Number(item.quotedValue || 0)])
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      todayCount,
      todayValue,
      allQuoteValue: dashboardData?.totals ? Number(dashboardData.totals.quotedValue || 0) : localQuotedValue,
      savedBookingCount: dashboardData?.totals ? Number(dashboardData.totals.bookings || 0) : bookingsData.length,
      recognizedRevenue: Number(dashboardData?.totals?.recognizedRevenue || 0),
      configuredFleet: dashboardData?.totals ? Number(dashboardData.totals.configuredFleetUnits || 0) : vehicles.reduce((sum, vehicle) => sum + (Number(vehicle.fleetCount) || 0), 0),
      blockedUnits: Number(dashboardData?.totals?.blockedFleetUnits || 0),
      availableFleet: Number(dashboardData?.totals?.availableFleetUnits || 0),
      pricingRuleCount: matrixData.filter(rule => rule.status === "active").length + templatesData.length + seasonalData.filter(rule => rule.enabled === true).length,
      recentBookings: (Array.isArray(dashboardData?.recentBookings) && dashboardData.recentBookings.length ? dashboardData.recentBookings : validBookings).slice(0, 4),
      revenueByVehicle: quoteValueByVehicle,
      activityLabels: activity.labels,
      activityCounts: activity.counts,
      activityMax: Math.max(1, ...activity.counts)
    };
  }, [bookingsData, dashboardData, matrixData, templatesData, seasonalData, activityPeriod]);

  const formatRelativeTime = value => {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return "Unknown date";
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString("en-GB");
  };
  const activityValues = dashboardMetrics.activityCounts.map(count => Math.max(count > 0 ? 12 : 0, (count / dashboardMetrics.activityMax) * 100));
  const tabMeta = {
    dashboard: { label: "Executive Dashboard", desc: "High-level overview of system metrics and fleet activity." },
    pricing: { label: "Pricing Rules Engine", desc: "Configure global logistics margins, fixed route premiums, and dynamic multipliers." },
    fleet:   { label: "Fleet Economics", desc: "Set fleet economics, overheads, and variable costs." },
    bookings:{ label: "Quotation", desc: "Browse quote requests and export Excel reports." },
    settings:{ label: "System Settings", desc: "Global calculator settings and surcharges." },
  };

  const navItems = [
    { k: "dashboard", label: "Dashboard",      icon: <SvgGrid size={17} color="currentColor" /> },
    { k: "fleet",   label: "Fleet Economics",                  icon: <SvgBus size={17} color="currentColor" /> },
    { k: "pricing", label: "Pricing Rules",      icon: <SvgPricing size={17} color="currentColor" /> },
    { k: "bookings",label: "Quotations",                  icon: <SvgBookings size={17} color="currentColor" /> },
    { k: "settings",label: "Settings",                 icon: <SvgSettings size={17} color="currentColor" /> },
  ].filter(item => canAccessTab(item.k));

  return (
    <div className="admin-premium-shell bg-background text-on-surface dark:bg-[#0B0F19] dark:text-white min-h-screen transition-colors duration-300" style={{ opacity: isReady ? 1 : 0 }} onBlurCapture={() => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        flushAutosave();
      }
    }}>
      {/* ── SideNavBar ─────────────────────────────── */}
      <aside className="premium-sidebar h-screen w-64 fixed left-0 top-0 border-r border-outline-variant dark:border-[#1F2937] bg-surface dark:bg-[#111827] flex flex-col py-md px-sm z-50 transition-colors duration-300">
        <div className="mb-xl px-sm pt-4 flex flex-col items-center text-center">
          <div style={{ background: "#fff", padding: "8px", borderRadius: "12px", marginBottom: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <img src="/carolean%20image.png" alt="Carolean Logo" style={{ height: "48px", objectFit: "contain" }} />
          </div>
          <h1 className="font-title-md text-title-md font-bold text-primary dark:text-white" style={{ fontSize: "17px", lineHeight: 1.2 }}>Carolean Admin Panel</h1>
          <p className="font-label-caps text-[12px] text-on-surface-variant dark:text-[#9CA3AF] tracking-widest mt-xs uppercase mt-2">Management Suite</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ k, label, icon }) => {
            const isSel = tab === k;
            return (
              <div key={k} className={k === 'settings' ? 'sidebar-settings-item' : undefined}>
                <button onClick={() => setTab(k)} className={`w-full flex items-center gap-3 px-sm py-3 rounded transition-colors duration-200 group ${isSel ? "text-primary dark:text-[#60A5FA] font-bold border-r-2 border-primary dark:border-[#60A5FA] bg-surface-container-low dark:bg-[#1F2937]" : "text-on-surface-variant dark:text-[#9CA3AF] hover:bg-surface-container-low dark:hover:bg-[#1F2937] hover:text-primary dark:hover:text-white"}`}>
                  <span className={`flex-shrink-0 flex items-center justify-center ${isSel ? "text-primary" : "text-on-surface-variant group-hover:text-primary"}`}>
                    {icon}
                  </span>
                  <span className="font-label-caps text-label-caps truncate min-w-0">{label}</span>
                </button>
                {k === 'settings' && (
                  <div className="sidebar-settings-subnav pl-11 py-1 space-y-0.5">
                    {[...(hasPermission('settings') ? [['company', 'Business'], ['pricing', 'Pricing']] : []), ...(hasPermission('staff') ? [['staff', 'Staff Access']] : [])].map(([key, subLabel]) => {
                      const subSel = tab === 'settings' && settingsSection === key;
                      return (
                        <button key={key} onClick={() => { setTab('settings'); setSettingsSection(key); }} className={`w-full text-left px-sm py-1.5 rounded text-[13px] font-bold transition-colors duration-200 ${subSel ? "text-primary dark:text-[#60A5FA] bg-surface-container-low dark:bg-[#1F2937]" : "text-on-surface-variant dark:text-[#9CA3AF] hover:bg-surface-container-low dark:hover:bg-[#1F2937] hover:text-primary dark:hover:text-white"}`}>
                          <span className="sidebar-settings-subnav-icon hidden" aria-hidden="true">{key === 'company' ? <SvgGrid size={16} color="currentColor" /> : key === 'pricing' ? <SvgPricing size={16} color="currentColor" /> : <SvgUser size={16} color="currentColor" />}</span>
                          <span className="sidebar-settings-subnav-label">{subLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-account mt-auto">
          <div className="sidebar-account-profile">
            <div className="sidebar-account-avatar">{String(adminUser?.name || adminUser?.email || "A").charAt(0).toUpperCase()}</div>
            <div className="sidebar-account-copy">
              <strong>{adminUser?.name || "Administrator"}</strong>
              <span>{adminUser?.email || "Secure admin account"}</span>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="sidebar-account-logout"><SvgUser size={15} color="currentColor"/><span>Log out</span></button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────── */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* TopNavBar */}
        <header className="premium-header h-16 sticky top-0 z-40 bg-surface dark:bg-[#111827] border-b border-outline-variant dark:border-[#1F2937] flex justify-between items-center w-full px-gutter shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-gutter">
            <div className="admin-global-search relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                value={globalSearch}
                onChange={event => { setGlobalSearch(event.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && searchResults[0]) openSearchDestination(searchResults[0]);
                  if (event.key === 'Escape') { setSearchOpen(false); setGlobalSearch(''); }
                }}
                aria-label="Search admin sections"
                aria-expanded={searchOpen && Boolean(globalSearch.trim())}
                className="bg-surface-container-lowest dark:bg-[#0B0F19] border border-outline-variant dark:border-[#374151] rounded-full py-1.5 pl-10 pr-4 text-body-sm w-64 focus:outline-none focus:border-primary dark:focus:border-[#60A5FA] text-on-surface dark:text-white transition-colors"
                placeholder="Search dashboard..."
                type="search"
              />
              {searchOpen && globalSearch.trim() && (
                <div className="admin-search-results" role="listbox">
                  {searchResults.length > 0 ? searchResults.map(result => (
                    <button key={`${result.tab}-${result.label}`} type="button" role="option" onMouseDown={event => event.preventDefault()} onClick={() => openSearchDestination(result)}>
                      <Search size={13} />
                      <span><strong>{result.label}</strong><small>{result.description}</small></span>
                      <span className="admin-search-arrow">›</span>
                    </button>
                  )) : <div className="admin-search-empty">No matching dashboard section</div>}
                </div>
              )}
            </div>
            <nav className="header-quick-nav hidden md:flex" aria-label="Quick navigation">
              {frequentFeatures.map(feature => (
                <button
                  key={feature.key}
                  type="button"
                  onClick={() => openFrequentFeature(feature)}
                  title={`Used ${feature.count} time${feature.count === 1 ? '' : 's'}`}
                  className={activeFeature === feature.key ? "is-active" : ""}
                >{feature.label}</button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-outline dark:text-[#9CA3AF] hover:text-primary dark:hover:text-white transition-colors font-bold text-lg" onClick={() => setDarkMode(v => !v)}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className={`dashboard-ambient-canvas flex-1 flex flex-col ${tab === "bookings" ? "" : "p-margin-safe space-y-md"} ${tab === "pricing" ? "pricing-page-active" : ""}`}>
          <div className="dashboard-abstract-lines" aria-hidden="true">
            <svg viewBox="0 0 1600 1000" preserveAspectRatio="none">
              <defs>
                <linearGradient id="dashboardContourBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#294f73" stopOpacity=".38"/><stop offset=".62" stopColor="#527d82" stopOpacity=".18"/><stop offset="1" stopColor="#294f73" stopOpacity=".03"/></linearGradient>
                <linearGradient id="dashboardContourRed" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a73746" stopOpacity=".04"/><stop offset=".58" stopColor="#a73746" stopOpacity=".14"/><stop offset="1" stopColor="#294f73" stopOpacity=".3"/></linearGradient>
              </defs>
              <g className="contour-family contour-family-top" stroke="url(#dashboardContourBlue)">
                {Array.from({length:22}, (_,index) => <path key={`top-${index}`} d="M-220 -55 C40 155 225 225 405 112 C590 -4 735 5 955 118 C1125 205 1310 176 1730 6" transform={`translate(0 ${index * 20})`}/>) }
              </g>
              <g className="contour-family contour-family-bottom" stroke="url(#dashboardContourRed)">
                {Array.from({length:24}, (_,index) => <path key={`bottom-${index}`} d="M210 1110 C455 815 650 690 865 742 C1090 798 1235 660 1450 565 C1560 516 1650 500 1740 510" transform={`translate(0 ${index * -19})`}/>) }
              </g>
            </svg>
          </div>
          {hasData && tab !== "bookings" && tab !== "settings" && (
          <section>
                      <div className="flex justify-between items-end mb-md">
                        <div>
                          <h2 className="font-headline-lg text-headline-lg text-on-surface dark:text-white transition-colors">
                            {tab === "dashboard" ? "Executive Dashboard" : tab === "settings" ? "Operations Hub" : tab === "fleet" ? "Economics Engine" : tab === "bookings" ? "Quotation Management" : "Pricing Rules Engine"}
                          </h2>
                          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-[#9CA3AF]">{tabMeta[tab]?.desc}</p>
                        </div>
                        <div className="flex gap-2">
                        </div>
                      </div>
                    </section>
          )}

          {!hasData && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
              <div className="h-8 w-8 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-primary animate-spin" />
              <p className="text-xs font-semibold uppercase tracking-wide">Loading dashboard…</p>
            </div>
          )}

          <div style={{ display: hasData ? "flex" : "none", flexDirection: "column", gap: tab === "bookings" ? 0 : 16, flex: 1, minHeight: 0 }}>
          
                    {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• DASHBOARD â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {tab === "dashboard" && (
            <div className="dashboard-premium flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto p-7 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-6 py-5 shadow-sm">
                <div>
                  <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400 mb-1.5">Operations overview</div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Good morning, Carolean</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Live figures calculated from saved quotations and fleet configuration.</p>
                </div>
                <div className="flex items-center gap-3">
                  {dashboardLoadError ? (
                    <button type="button" onClick={refreshDashboardData} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs font-bold border-0"><RefreshCw size={13}/> Metrics unavailable · Retry</button>
                  ) : !dashboardData ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 text-xs font-bold">Loading data...</div>
                  ) : null}
                </div>
              </div>
              
              {/* Top Row: KPI Cards */}
              <div className="dashboard-kpis grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Card 1: total persisted quotation value */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-end items-start mb-4">
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[13px] font-bold px-2 py-1 rounded-full">All saved quotes</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Quotation Value</div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">£{fmt(dashboardMetrics.allQuoteValue)}</div>
                  </div>
                </div>

                {/* Card 2: configured fleet availability */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-end items-start mb-4">
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[13px] font-bold px-2 py-1 rounded-full">Configured units</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Available Fleet</div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {dashboardMetrics.availableFleet} <span className="text-lg text-slate-400 font-semibold">/{dashboardMetrics.configuredFleet}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: all persisted quotations */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-end items-start mb-4">
                    <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:purple-400 text-[13px] font-bold px-2 py-1 rounded-full">Backend</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Saved Quotations</div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{dashboardMetrics.savedBookingCount}</div>
                  </div>
                </div>

                {/* Card 4: active pricing configuration */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Active Pricing Rules</div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{dashboardMetrics.pricingRuleCount}</div>
                  </div>
                </div>
              </div>

              {/* Middle Row: Analytics */}
              <div className="dashboard-analytics grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Fleet Activity Chart Placeholder */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Scheduled Journey Activity</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Persisted journeys by departure · {activityPeriod === "daily" ? "today by time" : activityPeriod === "weekly" ? "last 7 days" : "last 12 months"}</p>
                    </div>
                    <div className="fleet-period-toggle flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                      <button onClick={() => setActivityPeriod("daily")} className={`px-3 py-1 text-xs font-semibold rounded shadow-sm transition-colors ${activityPeriod === "daily" ? "analytics-toggle-active bg-white dark:bg-slate-600 text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>Daily</button>
                      <button onClick={() => setActivityPeriod("weekly")} className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${activityPeriod === "weekly" ? "analytics-toggle-active bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>Weekly</button>
                      <button onClick={() => setActivityPeriod("monthly")} className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${activityPeriod === "monthly" ? "analytics-toggle-active bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>12 Months</button>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between relative min-h-[200px]">
                    {/* Faux Chart Lines */}
                    <div className="border-b border-slate-100 dark:border-slate-700/50 absolute w-full top-0"></div>
                    <div className="border-b border-slate-100 dark:border-slate-700/50 absolute w-full top-1/4"></div>
                    <div className="border-b border-slate-100 dark:border-slate-700/50 absolute w-full top-2/4"></div>
                    <div className="border-b border-slate-100 dark:border-slate-700/50 absolute w-full top-3/4"></div>
                    <div className="border-b border-slate-100 dark:border-slate-700/50 absolute w-full bottom-0"></div>
                    
                    <div className="absolute left-0 top-5 bottom-7 flex flex-col justify-between text-[11px] text-slate-400 dark:text-slate-500"><span>{dashboardMetrics.activityMax}</span><span>{Math.ceil(dashboardMetrics.activityMax * .75)}</span><span>{Math.ceil(dashboardMetrics.activityMax * .5)}</span><span>{Math.ceil(dashboardMetrics.activityMax * .25)}</span><span>0</span></div>
                    <div className="fleet-chart-legend absolute top-2 right-0 flex items-center gap-3 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5"><span className="fleet-legend-standard w-2 h-2 rounded-sm"></span>Scheduled journeys</span>
                      <span className="flex items-center gap-1.5"><span className="fleet-legend-peak w-2 h-2 rounded-sm"></span>Highest interval</span>
                    </div>
                    <div className="absolute inset-0 h-full flex items-end pl-6 pr-4 gap-3 sm:gap-5 pb-7 pt-12">
                      {activityValues.map((height, i) => (
                        <div key={i} className="flex-1 h-full bg-transparent rounded-t-sm relative group min-w-0">
                          <div title={`${dashboardMetrics.activityCounts[i]} scheduled journeys`} style={{ height: `${height}%` }} className={`fleet-activity-bar ${dashboardMetrics.activityCounts[i] === dashboardMetrics.activityMax && dashboardMetrics.activityCounts[i] > 0 ? "fleet-activity-bar-peak" : ""} absolute bottom-0 w-full rounded-t-[5px] transition-all duration-300`}>
                            <span aria-hidden="true" className="fleet-bar-side" />
                            <span aria-hidden="true" className="fleet-bar-top" />
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[12px] font-bold text-slate-600 dark:text-slate-300 opacity-100 whitespace-nowrap">{dashboardMetrics.activityCounts[i]}</span>
                          </div>
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{dashboardMetrics.activityLabels[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 grid grid-cols-3 gap-3">
                    <div><div className="text-[12px] text-slate-500 dark:text-slate-400">Highest interval</div><div className="fleet-peak-value text-sm font-bold text-slate-900 dark:text-white">{dashboardMetrics.activityCounts.some(Boolean) ? dashboardMetrics.activityLabels[dashboardMetrics.activityCounts.indexOf(dashboardMetrics.activityMax)] : "No activity"}</div></div>
                    <div><div className="text-[12px] text-slate-500 dark:text-slate-400">Average per interval</div><div className="text-sm font-bold text-slate-900 dark:text-white">{(dashboardMetrics.activityCounts.reduce((sum, count) => sum + count, 0) / dashboardMetrics.activityCounts.length).toFixed(1)}</div></div>
                    <div><div className="text-[12px] text-slate-500 dark:text-slate-400">Journeys in period</div><div className="text-sm font-bold text-slate-900 dark:text-white">{dashboardMetrics.activityCounts.reduce((sum, count) => sum + count, 0)}</div></div>
                  </div>
                </div>

                {/* Quotation value by configured vehicle */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quotation Value</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Saved quotation value grouped by assigned vehicle</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center mb-6">
                    {/* Simple CSS Donut representation */}
                    <div className="financial-donut w-36 h-36 rounded-full relative flex items-center justify-center">
                      <div className="financial-donut-center rounded-full text-center flex flex-col items-center justify-center">
                        <div className="text-[18px] leading-none whitespace-nowrap font-extrabold text-slate-900 dark:text-white">£{fmt(dashboardMetrics.allQuoteValue)}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">Saved Quote Value</div>
                      </div>
                    </div>
                    <div className="financial-total-caption text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3">{bookingsData.length} saved quotations</div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {dashboardMetrics.revenueByVehicle.length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">No priced quotations have been saved.</div>
                    ) : dashboardMetrics.revenueByVehicle.map(([name, value]: any, index) => (
                      <div key={name} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ["#294F73", "#A22D3A", "#5F8A82", "#7C3AED", "#D97706"][index] }}></span><span className="text-slate-600 dark:text-slate-300 font-semibold truncate">{name}</span></div>
                        <span className="font-bold text-slate-900 dark:text-white ml-3">£{fmt(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Operations */}
              <div className="dashboard-operations grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
                {/* Recent quotation activity from the bookings API */}
                <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Quotations</h3>
                  </div>
                  <div className="flex flex-col">
                    {dashboardMetrics.recentBookings.length === 0 ? (
                      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No quotation activity is available.</div>
                    ) : dashboardMetrics.recentBookings.map(booking => (
                      <button key={booking.id} type="button" onClick={() => { setPreviewBooking(booking); setTab("bookings"); }} className="w-full flex items-start gap-4 p-5 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">#{booking.id} · {booking.customer?.name || "Unnamed customer"}</h4>
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2">{formatRelativeTime(booking.createdAt)}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{booking.journey?.origin || "Origin not set"} → {booking.journey?.destination || "Destination not set"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-4 text-center">
                    <button onClick={() => setTab("bookings")} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">View all quotations</button>
                  </div>
                </div>

                {/* Fleet operations summary - useful with or without the Maps API */}
                <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden relative min-h-[300px] flex flex-col">
                  <div className="relative z-10 p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <div className="text-base font-bold text-slate-900 dark:text-white">Fleet Configuration</div>
                        <div className="mt-1 text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Saved vehicle and availability data</div>
                      </div>
                      <button onClick={() => setTab("fleet")} className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                        View fleet →
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-5">
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 p-3">
                        <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">{dashboardMetrics.availableFleet}</div>
                        <div className="text-[12px] font-semibold text-emerald-700/70 dark:text-emerald-400/70">Available</div>
                      </div>
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 p-3">
                        <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400">{dashboardMetrics.blockedUnits}</div>
                        <div className="text-[12px] font-semibold text-amber-700/70 dark:text-amber-400/70">Blocked today</div>
                      </div>
                      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 p-3">
                        <div className="text-xl font-extrabold text-red-700 dark:text-red-400">{vehicles.length}</div>
                        <div className="text-[12px] font-semibold text-red-700/70 dark:text-red-400/70">Vehicle tiers</div>
                      </div>
                    </div>

                    <div className="text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Configured tiers</div>
                    <div className="space-y-2 flex-1">
                      {vehicles.length === 0 ? <div className="text-xs text-slate-500 dark:text-slate-400">No vehicle tiers configured.</div> : vehicles.slice(0, 3).map(vehicle => (
                        <button key={vehicle.id} onClick={() => { setActiveVehicleId(vehicle.id); setTab("fleet"); }} className="w-full flex items-center gap-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/50 p-3 text-left hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                          <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{vehicle.name}</span><span className="block text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{Number(vehicle.fleetCount) || 0} units · capacity {Number(vehicle.capacity) || 0}</span></span>
                          <span className="text-slate-400">›</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• BOOKINGS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {tab === "bookings" && (
            <div id="quotation-workspace" onPointerDownCapture={() => recordFeatureUsage('quotations')} className="quotations-page grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(350px,420px)] gap-3 bg-slate-50 dark:bg-[#0B0F19] p-3 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
              
              {/* LEFT COLUMN: Quotations List */}
              <div className="quotation-list-pane bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden min-w-0 min-h-0">
                <div className="py-4 px-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <h2 className="m-0 text-lg font-extrabold text-slate-900 dark:text-slate-100">Quotations</h2>
                    <span className="bg-slate-100 dark:bg-slate-700 py-1 px-2 rounded-xl text-[13px] font-bold text-slate-500 dark:text-slate-400">{filteredBookingsData.length} Total</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn variant="ghost" size="sm" style={{ color: bookingLast30Days ? "#fff" : (darkMode ? "#cbd5e1" : PX.navy800), background: bookingLast30Days ? PX.brandRed : "transparent", borderColor: bookingLast30Days ? PX.brandRed : (darkMode ? "#475569" : PX.gray200) }} onClick={() => setBookingLast30Days(v=>!v)}><CalendarDays size={14}/> Last 30 Days</Btn>
                    <Btn variant="ghost" size="sm" style={{ color: showBookingFilters ? "#fff" : (darkMode ? "#cbd5e1" : PX.navy800), background: showBookingFilters ? PX.brandRed : "transparent", borderColor: showBookingFilters ? PX.brandRed : (darkMode ? "#475569" : PX.gray200) }} onClick={() => setShowBookingFilters(v=>!v)}><SlidersHorizontal size={14}/> Filter</Btn>
                    <Btn variant="ghost" size="sm" style={{ color: darkMode ? "#cbd5e1" : PX.navy800, borderColor: darkMode ? "#475569" : PX.gray200 }} onClick={exportBookingsToCSV}><Download size={14}/> Export Excel</Btn>
                  </div>
                </div>

                {showBookingFilters && <div className="quotation-filters adm-search-bar flex flex-wrap gap-2 items-center overflow-x-auto">
                  <input type="text" placeholder="Name / Ref ID" value={searchNameRef} onChange={e=>setSearchNameRef(e.target.value)} />
                  <input type="text" placeholder="Vehicle" value={searchVehicle} onChange={e=>setSearchVehicle(e.target.value)} />
                  <div className="quotation-fare-filter"><span>£ Fare</span><input type="number" min="0" placeholder="From" value={searchFareFrom} onChange={e=>setSearchFareFrom(e.target.value)} /><i>—</i><input type="number" min="0" placeholder="To" value={searchFareTo} onChange={e=>setSearchFareTo(e.target.value)} /></div>
                  <input type="text" placeholder="Route" value={searchRoute} onChange={e=>setSearchRoute(e.target.value)} />
                  <input aria-label="Quotation date" type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)} />
                  {(searchNameRef||searchVehicle||searchFareFrom||searchFareTo||searchRoute||reportDate) && <button onClick={()=>{setSearchNameRef('');setSearchVehicle('');setSearchFareFrom('');setSearchFareTo('');setSearchRoute('');setReportDate('');}}>Clear</button>}
                </div>}
                
                <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", background: darkMode ? "#111827" : "#fff" }}>
                  {bookingsLoadError && !isBookingsLoading && bookingsData.length === 0 ? (
                    <div className="adm-empty" style={{ margin: "2rem 0", color: "#b91c1c" }}>{bookingsLoadError}. The dashboard will retry automatically.</div>
                  ) : isBookingsLoading ? (
                    <div className="adm-empty" style={{ margin: "2rem 0", display: "flex", flexDirection: "column", gap: 12 }}>
                      <span className="spinning" style={{ fontSize: 24, color: PX.brandRed }}>⟳</span>
                      <span style={{ fontSize: 13, color: darkMode ? "#9ca3af" : "#667085" }}>Loading quotation data...</span>
                    </div>
                  ) : filteredBookingsData.length === 0 ? (
                    <div className="adm-empty" style={{ margin: "2rem 0" }}>No bookings found.</div>
                  ) : (
                    <table className="quotations-table w-full border-collapse">
                      <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                        <tr>
                          <th>REF ID</th>
                          <th>CUSTOMER</th>
                          <th>ROUTE DETAILS</th>
                          <th>ASSIGNED FLEET</th>
                          <th>FARE</th>
                          <th>MARGINS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookingsData.slice(0, bookingsDisplayCount || 100).map((b: any) => {
                          const isActive = previewBooking?.id === b.id;
                          return (
                            <tr key={b.id} onClick={() => setPreviewBooking(b)} style={{ cursor: "pointer", transition: "background 0.2s", background: isActive ? (darkMode ? "#1f2937" : "#f1f5f9") : "transparent" }} onMouseEnter={e => !isActive && (e.currentTarget.style.background = darkMode ? "#1f2937" : "#f8fafc")} onMouseLeave={e => !isActive && (e.currentTarget.style.background = "transparent")}>
                              <td className="quotation-ref" style={{ fontWeight: 800, color: darkMode ? "#fb7185" : PX.brandRed, fontSize: 12.5, letterSpacing: 0.15 }}>#{b.id}</td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div className="quotation-avatar" style={{ width: 32, height: 32, borderRadius: "50%", background: darkMode ? "#374151" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: darkMode ? "#f3f4f6" : "#64748b" }}>{b.customer?.name?.charAt(0) || "C"}</div>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: darkMode ? "#f3f4f6" : PX.navy800 }}>{b.customer?.name}</div>
                                    <div style={{ fontSize: 11, color: darkMode ? "#9ca3af" : PX.gray400 }}>{b.customer?.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: 13, color: darkMode ? "#f3f4f6" : PX.navy800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                                  {String(b.journey?.origin).split(',')[0]} → {String(b.journey?.destination).split(',')[0]}
                                </div>
                                <div style={{ fontSize: 11, color: darkMode ? "#9ca3af" : PX.gray500, marginTop: 2 }}>{new Date(b.createdAt).toLocaleDateString("en-GB")} • {new Date(b.createdAt).toLocaleTimeString("en-GB", {hour: '2-digit', minute:'2-digit'})}</div>
                              </td>
                              <td className="quotation-fleet" style={{ fontSize: 13, color: darkMode ? "#9ca3af" : PX.gray600, fontWeight: 500 }}>
                                <span>{b.quote?.vehicle?.name || "Not assigned"}</span>
                              </td>
                              <td className="quotation-fare" style={{ fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800, fontSize: 14 }}>
                                £{fmt(b.quote?.result?.finalPrice || b.quote?.result?.finalFare || 0)}
                              </td>
                              <td className="quotation-margins" style={{ fontSize: 12 }}>
                                {(() => {
                                  const rev = b.quote?.result?.finalPrice || b.quote?.result?.finalFare || 0;
                                  const bd = b.quote?.result?.breakdown || {};
                                  if (!rev) return <span style={{ color: darkMode ? "#475569" : "#cbd5e1" }}>-</span>;
                                  
                                  let surcharges = bd.surchargeTotal || 0;
                                  let distCost = bd.distanceCost || 0;
                                  let drvCost = bd.driverCost || 0;
                                  const overnightCost = bd.overnightCost || 0;
                                  
                                  const vehicle = (db.vehicles || []).find(v => v.id === b.quote?.vehicle?.id);
                                  
                                  // Graceful fallback for old dummy data to ensure realistic percentages
                                  if (distCost === 0 && drvCost === 0 && b.quote?.result?.totalKm) {
                                    const ratePerKm = Number(vehicle?.ratePerKm) || 1.2;
                                    const cw = Number(vehicle?.commercialWeight) || 1;
                                    const driverWage = Number(db.globalVars?.driverHourlyWage) || 15;
                                    distCost = (b.quote.result.totalKm * ratePerKm * cw);
                                    drvCost = (b.quote.result.totalShiftHrs || 0) * driverWage;
                                  }
                                  
                                  const { totalOverheads, totalFleetUnits } = fleetOverheadTotals;
                                  const overheadPerUnit = totalFleetUnits > 0 ? totalOverheads / totalFleetUnits : 0;
                                  
                                  const annualFixed = vehicle?.annualFixedCosts?.reduce((sum, c) => sum + Number(c.amount || 0), 0) 
                                      || vehicle?.annualCosts?.reduce((sum, c) => sum + Number(c.cost || 0), 0) || 0;
                                  const utilDays = Number(vehicle?.utilisationDays) || 225;
                                  const fleetCount = Number(vehicle?.fleetCount) || 1;
                                  
                                  const operatingDays = Math.max(1, Number(b.quote?.result?.opDays) || 1);
                                  const allocatedOverhead = Number.isFinite(Number(bd.allocatedOverhead)) ? Number(bd.allocatedOverhead) : (overheadPerUnit / utilDays) * operatingDays;
                                  const allocatedStanding = Number.isFinite(Number(bd.allocatedStanding)) ? Number(bd.allocatedStanding) : (annualFixed / fleetCount / utilDays) * operatingDays;
                                  
                                  const grossProfit = rev - surcharges - distCost - drvCost - overnightCost;
                                  const netProfit = grossProfit - allocatedStanding - allocatedOverhead;
                                  
                                  const baseForMargin = rev;
                                  if (baseForMargin <= 0) return <span style={{ color: darkMode ? "#475569" : "#cbd5e1" }}>-</span>;
                                  
                                  const grossMargin = (grossProfit / baseForMargin) * 100;
                                  const profitMargin = (netProfit / baseForMargin) * 100;
                                  
                                  return (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", minWidth: 120 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 11, color: darkMode ? "#9ca3af" : "#64748b", fontWeight: 600 }}>Total Profit</span>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: profitMargin > 0 ? (darkMode ? "#10b981" : "#059669") : (darkMode ? "#ef4444" : "#dc2626") }}>
                                          {profitMargin > 0 ? "+" : ""}£{fmt(netProfit)}
                                        </span>
                                      </div>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 10, color: darkMode ? "#6b7280" : "#94a3b8", fontWeight: 500 }}>Margin</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: profitMargin > 0 ? (darkMode ? "#10b981" : "#059669") : (darkMode ? "#ef4444" : "#dc2626") }}>
                                          {profitMargin.toFixed(1)}%
                                        </span>
                                      </div>
                                      <div style={{ height: 1, background: darkMode ? "#374151" : "#e2e8f0", margin: "2px 0" }} />
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 10, color: darkMode ? "#6b7280" : "#94a3b8", fontWeight: 500 }}>Gross</span>
                                        <span style={{ fontSize: 10, fontWeight: 600, color: darkMode ? "#9ca3af" : "#64748b" }}>
                                          {grossMargin.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {!isBookingsLoading && filteredBookingsData.length > 0 && <div className="quotation-results-footer">Showing 1 to {Math.min(filteredBookingsData.length, bookingsDisplayCount || 100)} of {filteredBookingsData.length} results</div>}
                  {filteredBookingsData.length > (bookingsDisplayCount || 100) && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                      <Btn variant="secondary" size="md" onClick={() => setBookingsDisplayCount((c: number) => (c || 100) + 100)}>Load More Bookings</Btn>
                    </div>
                  )}
                </div>
              </div>
              
              {/* RIGHT COLUMN: Executive Summary / Quote Details Panel */}
              <div className="quotation-detail-panel" style={{ background: darkMode ? "#111827" : "#fff", display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden", minWidth: 0, minHeight: 0, border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 12, boxShadow: darkMode ? "0 8px 24px rgba(0,0,0,.18)" : "0 4px 14px rgba(15,23,42,.06)" }}>
                {previewBooking ? (
                  <>
                    <div className="quotation-detail-header" style={{ padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${darkMode ? "#1f2937" : "#eaecf0"}`, background: darkMode ? "#0b0f19" : "#fcfcfd", zIndex: 10 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800, margin: 0 }}>Quote Details</h3>
                        <div style={{ fontSize: 11, fontWeight: 700, color: darkMode ? "#9ca3af" : PX.gray500, letterSpacing: 0.5, marginTop: 2 }}>REF: #{previewBooking.id} · {previewBooking.status ? String(previewBooking.status).toUpperCase() : "STATUS NOT SET"}</div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => printBookingPdf(previewBooking)} className="admin-icon-action" title="Download quotation PDF" aria-label="Download quotation PDF"><Download size={12}/></button>
                        <button type="button" onClick={() => openBookingEditor(previewBooking)} className="admin-icon-action admin-icon-edit" title="Edit quotation" aria-label="Edit quotation"><Edit3 size={12}/></button>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "10px 16px", borderBottom: `1px solid ${darkMode ? "#1f2937" : "#eaecf0"}`, background: darkMode ? "#111827" : "#fff" }}>
                      <div><div style={{ fontSize: 10, color: darkMode ? "#9ca3af" : PX.gray500, textTransform: "uppercase", letterSpacing: 1 }}>Net fare</div><div style={{ fontSize: 25, lineHeight: 1.1, fontWeight: 900, color: darkMode ? "#f3f4f6" : PX.navy800 }}>£{fmt(previewBooking.quote?.result?.finalPrice || previewBooking.quote?.result?.finalFare || 0)}</div><div style={{ fontSize: 9, color: darkMode ? "#6b7280" : PX.gray400, marginTop: 3 }}>£{fmt((previewBooking.quote?.result?.finalPrice || previewBooking.quote?.result?.finalFare || 0) * 1.2)} inc. VAT</div></div>
                      <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: darkMode ? "#9ca3af" : PX.gray500, textTransform: "uppercase", letterSpacing: 1 }}>Net margin target</div><div style={{ fontSize: 20, lineHeight: 1.1, fontWeight: 800, color: PX.brandRed }}>{previewBooking.quote?.result?.breakdown?.netMarginPct ?? "--"}{previewBooking.quote?.result?.breakdown?.netMarginPct != null ? "%" : ""}</div></div>
                    </div>
                    <nav aria-label="Quotation detail sections" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: `1px solid ${darkMode ? "#1f2937" : "#eaecf0"}`, background: darkMode ? "#111827" : "#fff", position: "sticky", top: 0, zIndex: 9 }}>
                      {([['route', 'Route'], ['costs', 'Costs'], ['customer', 'Customer']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setQuoteDetailTab(value)} style={{ border: 0, borderBottom: `2px solid ${quoteDetailTab === value ? PX.brandRed : "transparent"}`, background: "transparent", color: quoteDetailTab === value ? (darkMode ? "#f3f4f6" : PX.navy800) : (darkMode ? "#9ca3af" : PX.gray500), padding: "9px 4px", fontSize: 11, fontWeight: quoteDetailTab === value ? 800 : 600, cursor: "pointer" }}>{label}</button>)}
                    </nav>
                    
                    <div className="quotation-detail-map" style={{ display: quoteDetailTab === "route" ? "block" : "none", position: "relative", height: 220, flex: "0 0 220px", borderBottom: `1px solid ${darkMode ? "#1f2937" : "#eaecf0"}`, overflow: "hidden" }}>
                      <RouteMap result={previewBooking.quote?.result} journey={previewBooking.journey} gv={gv} height={220} minimal={true} darkMode={darkMode} mapsLoaded={mapsLoaded} />
                      <div style={{ position: "absolute", bottom: 12, left: 12, background: darkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.94)", color: darkMode ? "#e2e8f0" : PX.navy800, border: `1px solid ${darkMode ? "#475569" : "#e2e8f0"}`, padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 4, backdropFilter: "blur(4px)" }}>
                        <MapPinned size={12} /> ROUTE PREVIEW
                      </div>
                    </div>
                    
                    <div className="quotation-detail-body" style={{ padding: "12px 16px 14px" }}>
                      <div style={{ display: quoteDetailTab === "route" ? "block" : "none" }}><JourneyRouteDetails journey={previewBooking.journey} darkMode={darkMode} /></div>
                      <div style={{ display: quoteDetailTab === "customer" ? "flex" : "none", fontSize: 11, fontWeight: 800, color: darkMode ? "#6b7280" : PX.gray400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, alignItems: "center", gap: 8 }}>
                        <span>Customer & Requirements</span>
                        <div style={{ flex: 1, height: 1, background: darkMode ? "#1f2937" : "#f1f5f9" }} />
                      </div>
                      <div style={{ display: quoteDetailTab === "customer" ? "block" : "none", marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: darkMode ? "#6b7280" : PX.gray400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 7, display: "flex", alignItems: "center", gap: 8 }}>
                          <span>Customer</span><div style={{ flex: 1, height: 1, background: darkMode ? "#1f2937" : "#f1f5f9" }} />
                        </div>
                        <div style={{ background: darkMode ? "#1f2937" : PX.gray50, padding: 10, borderRadius: 8, border: `1px solid ${darkMode ? "#374151" : PX.gray200}` }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 8, alignItems: "start" }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: darkMode ? "#374151" : "#e5e7eb", color: darkMode ? "#f3f4f6" : PX.navy800, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800 }}>{String(previewBooking.customer?.name || "?").trim().charAt(0).toUpperCase()}</div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800 }}>{previewBooking.customer?.name || "-"}</div>
                                <div style={{ fontSize: 10, color: darkMode ? "#d1d5db" : PX.gray600, overflowWrap: "anywhere" }}>{previewBooking.customer?.email || "-"}</div>
                                <div style={{ fontSize: 10, color: darkMode ? "#d1d5db" : PX.gray600 }}>{previewBooking.customer?.phone || "-"}</div>
                                {previewBooking.customer?.company && <div style={{ fontSize: 10, color: darkMode ? "#9ca3af" : PX.gray500 }}>{previewBooking.customer.company}</div>}
                              </div>
                            </div>
                            <div style={{ paddingBottom: 9, borderBottom: `1px solid ${darkMode ? "#374151" : PX.gray200}` }}>
                              <div style={{ fontSize: 9, color: darkMode ? "#9ca3af" : PX.gray500, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Requirements</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "5px 8px", fontSize: 10, color: darkMode ? "#d1d5db" : PX.gray600 }}>
                                <span>Passengers</span><strong style={{ color: darkMode ? "#f3f4f6" : PX.navy800 }}>{previewBooking.journey?.passengers || 0}</strong>
                                <span>Vehicle</span><strong style={{ color: darkMode ? "#f3f4f6" : PX.navy800, textAlign: "right" }}>{previewBooking.quote?.vehicle?.name || "-"}</strong>
                                <span>Luggage</span><strong style={{ color: darkMode ? "#f3f4f6" : PX.navy800, textAlign: "right" }}>{previewBooking.journey?.handbagCount ?? 0} handbags · {previewBooking.journey?.suitcaseCount ?? 0} suitcases</strong>
                              </div>
                            </div>
                          </div>
                          {previewBooking.journey?.journeyType === "return" && <div style={{ marginTop: 9, paddingTop: 8, borderTop: `1px solid ${darkMode ? "#374151" : PX.gray200}`, display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10 }}><span style={{ color: darkMode ? "#9ca3af" : PX.gray500 }}>Return journey</span><strong style={{ color: darkMode ? "#f3f4f6" : PX.navy800, textAlign: "right" }}>{previewBooking.journey?.returnDate ? new Date(previewBooking.journey.returnDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Not set"}</strong></div>}
                          {previewBooking.journey?.specialRequests && <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${darkMode ? "#374151" : PX.gray200}`, fontSize: 10, color: darkMode ? "#d1d5db" : PX.gray700 }}><strong>Special request:</strong> {previewBooking.journey.specialRequests}</div>}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: darkMode ? "#6b7280" : PX.gray400, textTransform: "uppercase", letterSpacing: 1, margin: "14px 0 7px", display: "flex", alignItems: "center", gap: 8 }}>
                          <span>Activity</span><div style={{ flex: 1, height: 1, background: darkMode ? "#1f2937" : "#f1f5f9" }} />
                        </div>
                        <div style={{ borderLeft: `2px solid ${PX.brandRed}`, paddingLeft: 9, display: "grid", gap: 8, fontSize: 10 }}>
                          <div><strong style={{ display: "block", color: darkMode ? "#f3f4f6" : PX.navy800 }}>Quotation created</strong><span style={{ color: darkMode ? "#9ca3af" : PX.gray500 }}>{previewBooking.createdAt ? new Date(previewBooking.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Stored booking"}</span></div>
                          <div><strong style={{ display: "block", color: darkMode ? "#f3f4f6" : PX.navy800 }}>Pricing engine resolved fare</strong><span style={{ color: darkMode ? "#9ca3af" : PX.gray500 }}>Stored quotation result</span></div>
                          <div><strong style={{ display: "block", color: darkMode ? "#f3f4f6" : PX.navy800 }}>Quotation status</strong><span style={{ color: darkMode ? "#9ca3af" : PX.gray500 }}>{String(previewBooking.status || "NEW").toUpperCase()}</span></div>
                        </div>
                      </div>

                      <div style={{ display: quoteDetailTab === "route" ? "flex" : "none", fontSize: 11, fontWeight: 800, color: darkMode ? "#6b7280" : PX.gray400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, alignItems: "center", gap: 8 }}>
                        <span>Journey Metrics</span>
                        <div style={{ flex: 1, height: 1, background: darkMode ? "#1f2937" : "#f1f5f9" }} />
                      </div>
                      
                      <div style={{ display: quoteDetailTab === "route" ? "grid" : "none", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                        <div style={{ border: `1px solid ${darkMode ? "#374151" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 16px", background: darkMode ? "#1f2937" : "#fff" }}>
                          <div style={{ fontSize: 11, color: darkMode ? "#9ca3af" : PX.gray500, fontWeight: 600, marginBottom: 4 }}>Total Distance</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800 }}>{previewBooking.quote?.result?.totalKm || 0} <span className="text-sm font-semibold">{gv?.distanceUnit === "miles" ? "mi" : "km"}</span></div>
                        </div>
                        <div style={{ border: `1px solid ${darkMode ? "#374151" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 16px", background: darkMode ? "#1f2937" : "#fff" }}>
                          <div style={{ fontSize: 11, color: darkMode ? "#9ca3af" : PX.gray500, fontWeight: 600, marginBottom: 4 }}>Est. Duration</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800 }}>{previewBooking.quote?.result?.totalShiftHrs || 0} <span className="text-sm font-semibold">h</span></div>
                        </div>
                        <div style={{ border: `1px solid ${darkMode ? "#374151" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 16px", background: darkMode ? "#1f2937" : "#fff" }}>
                          <div style={{ fontSize: 11, color: darkMode ? "#9ca3af" : PX.gray500, fontWeight: 600, marginBottom: 4 }}>Live {distanceUnitShort}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800 }}>{previewBooking.quote?.result?.revenueKm || 0} <span className="text-sm font-semibold">{distanceUnitShort}</span></div>
                        </div>
                        <div style={{ border: `1px solid ${darkMode ? "#374151" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 16px", background: darkMode ? "#1f2937" : "#fff" }}>
                          <div style={{ fontSize: 11, color: darkMode ? "#9ca3af" : PX.gray500, fontWeight: 600, marginBottom: 4 }}>Revenue {distanceUnitShort}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800 }}>{previewBooking.quote?.result?.revenueKm || 0} <span className="text-sm font-semibold">{distanceUnitShort}</span></div>
                        </div>
                      </div>

                      <div style={{ display: quoteDetailTab === "costs" ? "flex" : "none", fontSize: 11, fontWeight: 800, color: darkMode ? "#6b7280" : PX.gray400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, alignItems: "center", gap: 8 }}>
                        <span>Fare Assessment</span>
                        <div style={{ flex: 1, height: 1, background: darkMode ? "#1f2937" : "#f1f5f9" }} />
                      </div>
                      
                      <div style={{ display: quoteDetailTab === "costs" ? "flex" : "none", flexDirection: "column", gap: 10, marginBottom: 24, fontSize: 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: darkMode ? "#d1d5db" : PX.gray600 }}>
                          <span>Base Rate ({previewBooking.quote?.vehicle?.name})</span>
                          <span style={{ fontWeight: 700, color: darkMode ? "#f3f4f6" : PX.navy800 }}>£{fmt(previewBooking.quote?.result?.baseFare || previewBooking.quote?.result?.subtotal || 0)}</span>
                        </div>
                        {(previewBooking.quote?.result?.tolls > 0) && (
                          <div style={{ display: "flex", justifyContent: "space-between", color: darkMode ? "#d1d5db" : PX.gray600 }}>
                            <span>Congestion & Toll Charges</span>
                            <span style={{ fontWeight: 700, color: darkMode ? "#f3f4f6" : PX.navy800 }}>£{fmt(previewBooking.quote?.result?.tolls)}</span>
                          </div>
                        )}
                        {(previewBooking.quote?.result?.parking > 0) && (
                          <div style={{ display: "flex", justifyContent: "space-between", color: darkMode ? "#d1d5db" : PX.gray600 }}>
                            <span>Parking & Airport Meet</span>
                            <span style={{ fontWeight: 700, color: darkMode ? "#f3f4f6" : PX.navy800 }}>£{fmt(previewBooking.quote?.result?.parking)}</span>
                          </div>
                        )}
                        {(previewBooking.quote?.result?.surcharges > 0) && (
                          <div style={{ display: "flex", justifyContent: "space-between", color: darkMode ? "#d1d5db" : PX.gray600 }}>
                            <span>Multiplier Surcharges</span>
                            <span style={{ fontWeight: 700, color: darkMode ? "#f3f4f6" : PX.navy800 }}>£{fmt(previewBooking.quote?.result?.surcharges)}</span>
                          </div>
                        )}
                        
                        <div style={{ height: 1, background: darkMode ? "#374151" : "#e2e8f0", margin: "8px 0" }} />
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: darkMode ? "#9ca3af" : PX.gray500, textTransform: "uppercase" }}>Total Net Fare</div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: darkMode ? "#f3f4f6" : PX.navy800, lineHeight: 1 }}>£{fmt(previewBooking.quote?.result?.finalPrice || previewBooking.quote?.result?.finalFare || 0)}</div>
                          </div>
                          <div className="text-right">
                            <div style={{ fontSize: 10, fontWeight: 600, color: darkMode ? "#6b7280" : PX.gray400 }}>INC. VAT (20%)</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: darkMode ? "#d1d5db" : PX.gray600 }}>£{fmt((previewBooking.quote?.result?.finalPrice || previewBooking.quote?.result?.finalFare || 0) * 1.2)}</div>
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const transparentResult = previewBooking.quote?.result || {};
                        const transparentBreakdown = transparentResult.breakdown || {};
                        const transparentUnit = transparentResult.distanceUnit === "miles" ? "mi" : "km";
                        const transparentMoney = value => Number.isFinite(Number(value)) ? `£${fmt(value)}` : "--";
                        const transparentDistanceCost = Number(transparentBreakdown.distanceCost) || 0;
                        const transparentTotalDistance = Number(transparentResult.totalKm) || 0;
                        const transparentLiveDistance = Number(transparentResult.revenueKm) || 0;
                        const transparentDeadDistance = Math.max(0, transparentTotalDistance - transparentLiveDistance);
                        const transparentRows = [
                          ["Live legs", transparentResult.revenueKm != null ? `${transparentResult.revenueKm} ${transparentUnit}` : null],
                          ["Dead legs", transparentResult.totalKm != null && transparentResult.revenueKm != null ? `${Math.max(0, Number(transparentResult.totalKm) - Number(transparentResult.revenueKm))} ${transparentUnit}` : null],
                          ["Total driven", transparentResult.totalKm != null ? `${transparentResult.totalKm} ${transparentUnit}` : null],
                          ["Driving time", transparentResult.liveDurationMinutes != null ? `${transparentResult.liveDurationMinutes} min` : null],
                          ["Empty running time", transparentResult.emptyRunningMinutes != null ? `${transparentResult.emptyRunningMinutes} min` : null],
                          ["Driver paid time", transparentResult.driverPaidMinutes != null ? `${transparentResult.driverPaidMinutes} min` : null],
                          ["Fuel & maintenance", transparentBreakdown.fuelCost != null || transparentBreakdown.maintenanceCost != null ? `${transparentMoney(transparentBreakdown.fuelCost)} + ${transparentMoney(transparentBreakdown.maintenanceCost)}` : null],
                          ["Live-leg running cost", transparentMoney(transparentBreakdown.liveDistanceCost ?? (transparentTotalDistance ? transparentDistanceCost * transparentLiveDistance / transparentTotalDistance : 0))],
                          ["Dead-leg running cost", transparentMoney(transparentBreakdown.deadDistanceCost ?? (transparentTotalDistance ? transparentDistanceCost * transparentDeadDistance / transparentTotalDistance : 0))],
                          ["Driver wages", transparentBreakdown.driverCost != null ? transparentMoney(transparentBreakdown.driverCost) : null],
                          ["Standing / overhead", transparentBreakdown.standingCost != null || transparentBreakdown.allocatedOverhead != null ? `${transparentMoney(transparentBreakdown.standingCost)} + ${transparentMoney(transparentBreakdown.allocatedOverhead)}` : null],
                          ["True cost", transparentBreakdown.accountingCost != null || transparentBreakdown.totalOperatingCost != null ? transparentMoney(transparentBreakdown.accountingCost ?? transparentBreakdown.totalOperatingCost) : null],
                          ["Base price", transparentResult.baseFare != null ? transparentMoney(transparentResult.baseFare) : null],
                          ["Minimum hire floor", previewBooking.quote?.vehicle?.minimumHire != null ? transparentMoney(previewBooking.quote.vehicle.minimumHire) : null],
                          ["Target margin", Number(transparentBreakdown.marginPct) > 0 ? `${transparentBreakdown.marginPct}%` : Number(transparentBreakdown.netMarginPct) > 0 ? `${transparentBreakdown.netMarginPct}%` : null],
                          ["Customer pays", transparentResult.finalPrice != null || transparentResult.finalFare != null ? transparentMoney(transparentResult.finalPrice ?? transparentResult.finalFare) : null],
                          ["Discount", transparentResult.discountAmount != null ? transparentMoney(transparentResult.discountAmount) : transparentResult.discount != null ? transparentMoney(transparentResult.discount) : null]
                        ].filter(([, value]) => value !== null);
                        return <>
                          <div style={{ display: quoteDetailTab === "costs" ? "flex" : "none", fontSize: 11, fontWeight: 800, color: darkMode ? "#6b7280" : PX.gray400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, alignItems: "center", gap: 8 }}>
                            <span>Transparent Price Breakdown</span>
                            <div style={{ flex: 1, height: 1, background: darkMode ? "#1f2937" : "#f1f5f9" }} />
                          </div>
                          <div style={{ display: quoteDetailTab === "costs" ? "grid" : "none", gridTemplateColumns: "1fr 1fr", gap: "0 18px", padding: "12px 14px", marginBottom: 24, background: darkMode ? "#111827" : PX.gray50, border: `1px solid ${darkMode ? "#374151" : PX.gray200}`, borderRadius: 8, fontSize: 12 }}>
                            {transparentRows.map(([label, value]) => <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: `1px solid ${darkMode ? "#1f2937" : "#e2e8f0"}` }}><span style={{ color: darkMode ? "#9ca3af" : PX.gray600 }}>{label}</span><strong style={{ color: darkMode ? "#f3f4f6" : PX.navy800, textAlign: "right" }}>{value}</strong></div>)}
                          </div>
                        </>;
                      })()}
                      
                      {(() => {
                        const rev = previewBooking.quote?.result?.finalPrice || previewBooking.quote?.result?.finalFare || 0;
                        const bd = previewBooking.quote?.result?.breakdown || {};
                        if (!rev) return null;
                        
                        let surcharges = bd.surchargeTotal || 0;
                        let distCost = bd.distanceCost || 0;
                        let drvCost = bd.driverCost || 0;
                        const overnightCost = bd.overnightCost || 0;
                        const totalDistance = Number(previewBooking.quote?.result?.totalKm) || 0;
                        const liveDistance = Number(previewBooking.quote?.result?.revenueKm) || 0;
                        const deadDistance = Math.max(0, Number(previewBooking.quote?.result?.deadKm ?? (totalDistance - liveDistance)) || 0);
                        
                        const vehicle = (db.vehicles || []).find(v => v.id === previewBooking.quote?.vehicle?.id);
                        
                        // Graceful fallback for old dummy data to ensure realistic percentages
                        if (distCost === 0 && drvCost === 0 && previewBooking.quote?.result?.totalKm) {
                          const ratePerKm = Number(vehicle?.ratePerKm) || 1.2;
                          const cw = Number(vehicle?.commercialWeight) || 1;
                          const driverWage = Number(db.globalVars?.driverHourlyWage) || 15;
                          distCost = (previewBooking.quote.result.totalKm * ratePerKm * cw);
                          drvCost = (previewBooking.quote.result.totalShiftHrs || 0) * driverWage;
                        }
                        const liveDistanceCost = Number.isFinite(Number(bd.liveDistanceCost)) ? Number(bd.liveDistanceCost) : (totalDistance > 0 ? distCost * liveDistance / totalDistance : 0);
                        const deadDistanceCost = Number.isFinite(Number(bd.deadDistanceCost)) ? Number(bd.deadDistanceCost) : (totalDistance > 0 ? distCost * deadDistance / totalDistance : 0);
                        const targetMargin = bd.marginPct ?? bd.netMarginPct ?? Number(db.globalVars?.marginWeekday ?? db.globalVars?.profitMarginPct) ?? 0;
                        
                        const totalOverheads = (db.annualOverheads || []).reduce((sum, item) => sum + Number(item.cost || 0), 0);
                        const totalFleetUnits = (db.vehicles || []).reduce((sum, v) => sum + (Number(v.fleetCount) || 0), 0);
                        const overheadPerUnit = totalFleetUnits > 0 ? totalOverheads / totalFleetUnits : 0;
                        
                        const annualFixed = vehicle?.annualFixedCosts?.reduce((sum, c) => sum + Number(c.amount || 0), 0) 
                            || vehicle?.annualCosts?.reduce((sum, c) => sum + Number(c.cost || 0), 0) || 0;
                        const utilDays = Number(vehicle?.utilisationDays) || 225;
                        const fleetCount = Number(vehicle?.fleetCount) || 1;
                        
                        const operatingDays = Math.max(1, Number(previewBooking.quote?.result?.opDays) || 1);
                        const allocatedOverhead = Number.isFinite(Number(bd.allocatedOverhead)) ? Number(bd.allocatedOverhead) : (overheadPerUnit / utilDays) * operatingDays;
                        const allocatedStanding = Number.isFinite(Number(bd.allocatedStanding)) ? Number(bd.allocatedStanding) : (annualFixed / fleetCount / utilDays) * operatingDays;

                        // Fuel/maintenance/tyre are only split out in the breakdown for quotes
                        // priced after this field was added. Older bookings still carry the
                        // combined distanceCost, so approximate the split using this vehicle's
                        // current per-km rates, scaled to reconcile with the recorded total.
                        let fuelCostVal, maintenanceCostVal, tyreCostVal;
                        if (Number.isFinite(Number(bd.fuelCost)) || Number.isFinite(Number(bd.maintenanceCost)) || Number.isFinite(Number(bd.tyreCost))) {
                          fuelCostVal = Number(bd.fuelCost) || 0;
                          maintenanceCostVal = Number(bd.maintenanceCost) || 0;
                          tyreCostVal = Number(bd.tyreCost) || 0;
                        } else {
                          const fuelRate = (vehicle?.fuelPricePerLitre ?? db.globalVars?.fuelPricePerLitre ?? 1.52) / (vehicle?.fuelKpl || 5);
                          const maintRate = Number(vehicle?.maintenanceCostPerKm) || ((Number(vehicle?.maintenanceSetCost) || 0) / (Number(vehicle?.expectedMaintenanceLifeKm) || 1)) || 0.15;
                          const tyreRate = Number(vehicle?.tyreCostPerKm) || ((Number(vehicle?.tyreSetCost) || 0) / (Number(vehicle?.expectedTyreLifeKm) || 1)) || 0.05;
                          const rateSum = fuelRate + maintRate + tyreRate;
                          fuelCostVal = rateSum > 0 ? distCost * (fuelRate / rateSum) : 0;
                          maintenanceCostVal = rateSum > 0 ? distCost * (maintRate / rateSum) : 0;
                          tyreCostVal = rateSum > 0 ? distCost * (tyreRate / rateSum) : 0;
                        }

                        const grossProfit = rev - surcharges - distCost - drvCost - overnightCost;
                        const netProfit = grossProfit - allocatedStanding - allocatedOverhead;
                        
                        const baseForMargin = rev;
                        if (baseForMargin <= 0) return null;

                        const grossMargin = (grossProfit / baseForMargin) * 100;
                        const profitMargin = (netProfit / baseForMargin) * 100;

                        return (
                          <div style={{ display: quoteDetailTab === "costs" ? "block" : "none" }}>
                            <div className="quotation-cost-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: 16, alignItems: "start" }}>
                              <div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: darkMode ? "#6b7280" : PX.gray400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                              <span>Financial Margins</span>
                              <div style={{ flex: 1, height: 1, background: darkMode ? "#1f2937" : "#f1f5f9" }} />
                            </div>
                            
                            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginBottom: 0 }}>
                              <thead>
                                <tr style={{ borderBottom: `1px solid ${darkMode ? "#374151" : "#e2e8f0"}`, color: darkMode ? "#9ca3af" : PX.gray500, fontSize: 11 }}>
                                  <th style={{ textAlign: "left", paddingBottom: 8, fontWeight: 700 }}>METRIC</th>
                                  <th style={{ textAlign: "right", paddingBottom: 8, fontWeight: 700 }}>AMOUNT (£)</th>
                                  <th style={{ textAlign: "right", paddingBottom: 8, fontWeight: 700 }}>MARGIN (%)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ borderBottom: `1px solid ${darkMode ? "#1f2937" : "#f1f5f9"}` }}>
                                  <td style={{ padding: "12px 0", color: darkMode ? "#d1d5db" : PX.gray700 }}><strong>Gross Profit</strong> <span style={{ fontSize: 10, color: darkMode ? "#6b7280" : PX.gray400, display: "block", marginTop: 2 }}>(Revenue minus direct trip costs)</span></td>
                                  <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 800, fontSize: 14, color: grossProfit > 0 ? (darkMode ? "#34d399" : "#16a34a") : (darkMode ? "#f87171" : "#dc2626") }}>£{fmt(grossProfit)}</td>
                                  <td style={{ padding: "12px 0", textAlign: "right" }}>
                                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 800, background: grossProfit > 0 ? (darkMode ? "rgba(52, 211, 153, 0.15)" : "rgba(22, 163, 74, 0.1)") : (darkMode ? "rgba(248, 113, 113, 0.15)" : "rgba(220, 38, 38, 0.1)"), color: grossProfit > 0 ? (darkMode ? "#34d399" : "#16a34a") : (darkMode ? "#f87171" : "#dc2626") }}>{grossMargin.toFixed(1)}%</span>
                                  </td>
                                </tr>
                                <tr style={{ borderBottom: `1px solid ${darkMode ? "#1f2937" : "#f1f5f9"}` }}>
                                  <td style={{ padding: "12px 0", color: darkMode ? "#d1d5db" : PX.gray700 }}><strong>Net Profit</strong> <span style={{ fontSize: 10, color: darkMode ? "#6b7280" : PX.gray400, display: "block", marginTop: 2 }}>(After daily fleet overheads & fixed costs)</span></td>
                                  <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 800, fontSize: 14, color: netProfit > 0 ? (darkMode ? "#34d399" : "#16a34a") : (darkMode ? "#f87171" : "#dc2626") }}>£{fmt(netProfit)}</td>
                                  <td style={{ padding: "12px 0", textAlign: "right" }}>
                                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 800, background: netProfit > 0 ? (darkMode ? "rgba(52, 211, 153, 0.15)" : "rgba(22, 163, 74, 0.1)") : (darkMode ? "rgba(248, 113, 113, 0.15)" : "rgba(220, 38, 38, 0.1)"), color: netProfit > 0 ? (darkMode ? "#34d399" : "#16a34a") : (darkMode ? "#f87171" : "#dc2626") }}>{profitMargin.toFixed(1)}%</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ padding: "12px 0", color: darkMode ? "#d1d5db" : PX.gray700 }}><strong>Target Profit Margin</strong> <span style={{ fontSize: 10, color: darkMode ? "#6b7280" : PX.gray400, display: "block", marginTop: 2 }}>(Admin Engine Setting)</span></td>
                                  <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 700, color: darkMode ? "#9ca3af" : PX.gray500 }}>--</td>
                                  <td style={{ padding: "12px 0", textAlign: "right" }}>
                                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 800, background: darkMode ? "rgba(148, 163, 184, 0.15)" : "rgba(100, 116, 139, 0.1)", color: darkMode ? "#94a3b8" : "#475569" }}>{targetMargin}%</span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                              </div>
                              <div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: darkMode ? "#6b7280" : PX.gray400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                              <span>Cost Breakdown</span>
                              <div style={{ flex: 1, height: 1, background: darkMode ? "#1f2937" : "#f1f5f9" }} />
                            </div>
                            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginBottom: 0 }}>
                              <tbody>
                                {[
                                  ['Live-leg miles', `${liveDistance} ${previewBooking.quote?.result?.distanceUnit === "miles" ? "mi" : "km"}`],
                                  ['Dead-leg miles', `${deadDistance} ${previewBooking.quote?.result?.distanceUnit === "miles" ? "mi" : "km"}`],
                                  ['Live-leg running cost', liveDistanceCost],
                                  ['Dead-leg running cost', deadDistanceCost],
                                  ['Fuel cost', fuelCostVal],
                                  ['Maintenance cost', maintenanceCostVal],
                                  ['Tyre cost', tyreCostVal],
                                  ['Driver cost', drvCost],
                                  ['Overnight / subsistence', overnightCost],
                                  ['Surcharges (tolls, ULEZ, CAZ)', surcharges],
                                ].map(([label, value]) => (
                                  <tr key={label as string} style={{ borderBottom: `1px solid ${darkMode ? "#1f2937" : "#f1f5f9"}` }}>
                                    <td style={{ padding: "8px 0", color: darkMode ? "#d1d5db" : PX.gray700 }}>{label}</td>
                                    <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: darkMode ? "#f3f4f6" : PX.navy800 }}>{typeof value === "string" ? value : `£${fmt(Number(value) || 0)}`}</td>
                                  </tr>
                                ))}
                                <tr style={{ borderBottom: `2px solid ${darkMode ? "#374151" : "#e2e8f0"}` }}>
                                  <td style={{ padding: "8px 0", fontWeight: 800, color: darkMode ? "#d1d5db" : PX.gray700 }}>Total direct cost</td>
                                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800 }}>£{fmt(surcharges + distCost + drvCost + overnightCost)}</td>
                                </tr>
                                {[
                                  ['Allocated vehicle overheads', allocatedStanding],
                                  ['Allocated company overhead', allocatedOverhead],
                                ].map(([label, value]) => (
                                  <tr key={label as string} style={{ borderBottom: `1px solid ${darkMode ? "#1f2937" : "#f1f5f9"}` }}>
                                    <td style={{ padding: "8px 0", color: darkMode ? "#d1d5db" : PX.gray700 }}>{label}</td>
                                    <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: darkMode ? "#f3f4f6" : PX.navy800 }}>£{fmt(Number(value) || 0)}</td>
                                  </tr>
                                ))}
                                <tr style={{ borderTop: `2px solid ${darkMode ? "#374151" : "#e2e8f0"}` }}>
                                  <td style={{ padding: "10px 0 4px", fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800 }}>Total operating cost</td>
                                  <td style={{ padding: "10px 0 4px", textAlign: "right", fontWeight: 900, color: darkMode ? "#f3f4f6" : PX.navy800 }}>£{fmt(surcharges + distCost + drvCost + overnightCost + allocatedStanding + allocatedOverhead)}</td>
                                </tr>
                              </tbody>
                            </table>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  </>
                ) : (
                  <div style={{ position: "relative", height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {depotLoc?.lat ? (
                      <div style={{ position: "absolute", inset: 0, opacity: darkMode ? 0.3 : 0.5, pointerEvents: "none" }}>
                        <DepotMapPreview lat={depotLoc.lat} lng={depotLoc.lng} darkMode={darkMode} />
                      </div>
                    ) : null}
                    <div style={{ position: "absolute", inset: 0, background: darkMode ? "linear-gradient(to bottom, rgba(17,24,39,0.7), rgba(17,24,39,1))" : "linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(255,255,255,1))" }} />
                    
                    <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", padding: 24, width: "100%", maxWidth: 340 }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: darkMode ? "rgba(31, 41, 55, 0.7)" : "rgba(241, 245, 249, 0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, border: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`, boxShadow: "0 6px 20px rgba(0,0,0,0.1)" }}>
                        <SvgMap size={22} color={darkMode ? "#60A5FA" : PX.brandRed} />
                      </div>
                      
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800, margin: "0 0 6px 0", letterSpacing: -0.2 }}>Carolean Quotation Centre</h3>
                      <p style={{ fontSize: 11, color: darkMode ? "#9ca3af" : PX.gray500, textAlign: "center", lineHeight: 1.5, margin: "0 0 20px 0" }}>Select a quotation to view its details</p>
                      
                      <div style={{ width: "100%", background: darkMode ? "rgba(31, 41, 55, 0.6)" : "rgba(255, 255, 255, 0.6)", backdropFilter: "blur(12px)", borderRadius: 12, border: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`, padding: 14, boxShadow: darkMode ? "0 4px 16px rgba(0,0,0,0.15)" : "0 4px 16px rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: darkMode ? "#9ca3af" : PX.gray500, textTransform: "uppercase", letterSpacing: 1 }}>System Status</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, background: darkMode ? "rgba(22, 163, 74, 0.15)" : "rgba(22, 163, 74, 0.1)", color: "#16a34a", padding: "2px 8px", borderRadius: 12, fontSize: 9, fontWeight: 800 }}>
                            <span style={{ width: 4, height: 4, background: "#16a34a", borderRadius: "50%", display: "inline-block", animation: "pulse 2s infinite" }} /> ONLINE
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#d1d5db" : PX.gray600 }}>Geospatial Engine</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800 }}>Connected</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#d1d5db" : PX.gray600 }}>Pricing Matrices</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800 }}>Active</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#d1d5db" : PX.gray600 }}>Today's Quotes</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: darkMode ? "#f3f4f6" : PX.navy800 }}>{filteredBookingsData.length} Processed</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PRICING & ROUTES â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {tab === "pricing" && (
            <div className="pricing-rules-page flex flex-col gap-5 flex-1 min-h-0 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-900/50">
              
              {/* TOP KPI ROW */}
              <div className="grid grid-cols-4 gap-4">
                
                <div className="bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Active Rules</div>
                  <div className="text-3xl font-black text-red-600 dark:text-red-400 leading-none">{templatesData.length + matrixData.filter(m=>m.status==='active').length}</div>
                  <div className="text-[13px] font-bold text-primary dark:text-primary-fixed mt-2 flex items-center gap-1">
                    <TrendingUp size={13} className="inline-block" /> +12% vs last month
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Avg Multiplier</div>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none">
                    {seasonalData.length > 0 ? (seasonalData.reduce((acc, curr) => acc + (curr.multiplier || 1), 0) / seasonalData.length).toFixed(2) : "1.00"}x
                  </div>
                  <div className="text-[13px] font-bold text-slate-500 dark:text-slate-400 mt-2">Dynamic pricing active</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Blocked Dates</div>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none">{blocks.length}</div>
                  <div className="text-[13px] font-bold text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                    <SvgMapPinRed size={12} /> Next: Christmas Peak
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Global Base Fare</div>
                  <div className="text-3xl font-black text-primary dark:text-primary-fixed leading-none">£{gv?.baseRate || 45}</div>
                  <div className="text-[13px] font-bold text-primary dark:text-primary-fixed mt-2">Optimized current fleet</div>
                </div>

              </div>

              {/* ROW 2: Fixed Routes & Blocked Dates */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

                {/* Fixed Route Templates */}
                <div id="pricing-routes" onPointerDownCapture={() => recordFeatureUsage('routes')} className="bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shadow-sm">
                  <div className="py-3 px-5 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <div><h3 className="m-0 text-[15px] font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">Fixed Route Templates</h3><p className="pricing-section-subtitle">Manage premiums for key routes and zones.</p></div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={()=>downloadCsv('fixed-route-templates.csv', ['Pickup','Drop-off','Vehicle','Trip Type','Price'], templatesData.map(t=>[t.pickupArea,t.dropArea,db.vehicles.find(v=>v.id===t.vehicleId)?.name || t.vehicleId,t.tripType,t.price]))} className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-1.5 px-3 rounded-md text-[12px] font-extrabold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"><Download size={13}/> Export CSV</button>
                      <button className="bg-primary text-on-primary hover:opacity-90 transition-opacity" style={{border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }} onClick={() => { setShowTemplateForm(!showTemplateForm); if(!showTemplateForm) setNT({...blankTemplate, vehicleId:db.vehicles[0]?.id}); }}>{showTemplateForm ? "Cancel" : <><Plus size={13}/> New Template</>}</button>
                    </div>
                  </div>

                  {showTemplateForm && (
                    <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                      <div className="adm-form-grid" style={{ marginBottom: 16, gap: 16 }}>
                        <div className="span2">
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Pickup Location</label>
                          <div className="custom-places-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                            <PlacesInput value={newTemplate.pickupArea||""} mapsLoaded={mapsLoaded} onChange={(v,geo)=>setNT(x=>({...x,pickupArea:v,pickupGeo:geo}))} icon={<SvgMapPinGreen />} />
                          </div>
                        </div>
                        <div className="span2">
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Drop-off Location</label>
                          <div className="custom-places-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                            <PlacesInput value={newTemplate.dropArea||""} mapsLoaded={mapsLoaded} onChange={(v,geo)=>setNT(x=>({...x,dropArea:v,dropGeo:geo}))} icon={<SvgMapPinRed />} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Trip Type</label>
                          <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none" value={newTemplate.tripType||"one-way"} onChange={e=>setNT(x=>({...x,tripType:e.target.value}))}>
                            <option value="one-way">One Way</option>
                            <option value="return">Return</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Eligible Vehicle</label>
                          <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none" value={newTemplate.vehicleId||""} onChange={e=>setNT(x=>({...x,vehicleId:e.target.value}))}>
                            {db.vehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Fixed Price (£)</label>
                          <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none" value={newTemplate.price||0} onChange={e=>setNT(x=>({...x,price:Number(e.target.value)}))} />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Route Radius ({distanceUnitShort})</label>
                          <input type="number" min="0" step="1" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none" value={newTemplate.radiusKm ?? 15} onChange={e=>setNT(x=>({...x,radiusKm:Number(e.target.value)}))} />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Waiting Charge (£/hr)</label>
                          <input type="number" min="0" step="0.5" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none" value={newTemplate.waitingChargePerHour ?? 0} onChange={e=>setNT(x=>({...x,waitingChargePerHour:Number(e.target.value)}))} />
                        </div>
                      </div>
                      <button className="bg-primary text-on-primary hover:opacity-90 transition-opacity" style={{border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }} onClick={async ()=>{
                        if(!newTemplate.pickupArea || !newTemplate.dropArea) return setToast("Pickup and dropoff required.");
                        const itemToSave = newTemplate.id ? newTemplate : {...newTemplate, id: 'new_'+Date.now()};
                        const saved = await saveApi('templates', itemToSave);
                        setTemplatesData(d => { const exists = d.some(x => x.id === saved.id); if (exists) return d.map(x => x.id === saved.id ? saved : x); return [saved, ...d]; });
                        setNT({...blankTemplate, vehicleId:db.vehicles[0]?.id});
                        setShowTemplateForm(false);
                        setToast("Route saved!"); setTimeout(()=>setToast(""),2000);
                      }}>{newTemplate.id ? "Done" : "+ Add Template"}</button>
                    </div>
                  )}

                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr>
                        <th className="py-2.5 px-5 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">Route Name</th>
                        <th className="py-2.5 px-5 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">Zone</th>
                        <th className="py-2.5 px-5 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">Base Rate</th>
                        <th className="py-2.5 px-5 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">Status</th>
                        <th className="py-2.5 px-5 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50" width={60}>Act</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templatesData.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">No fixed route templates configured.</td></tr>
                      )}
                      {templatesData.map((t, idx) => (
                        <tr key={t.id} className={`border-b border-slate-100 dark:border-slate-700/50 ${idx % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-800/80"} border-b-last-none`}>
                          <td className="py-2.5 px-5">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{String(t.pickupArea).split(',')[0]} - {String(t.dropArea).split(',')[0]}</div>
                            <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mt-1">{db.vehicles.find(v=>v.id===t.vehicleId)?.name}</div>
                          </td>
                          <td className="py-2.5 px-5">
                            <span className="py-1 px-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[11px] font-extrabold uppercase tracking-wide">{t.tripType === 'return' ? 'GLOBAL' : 'PREMIUM'}</span>
                          </td>
                          <td className="py-2.5 px-5 text-xs font-bold text-slate-900 dark:text-slate-100">
                            £{fmt(t.price)}
                          </td>
                          <td className="py-2.5 px-5">
                            <div className="flex items-center gap-1.5 text-[12px] font-bold text-primary dark:text-primary-fixed">
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }}></span> Active
                            </div>
                          </td>
                          <td className="py-2.5 px-5">
                            <div style={{ display: "flex", gap: 6 }}>
                              <button type="button" className="admin-icon-action admin-icon-edit" title="Edit route template" aria-label="Edit route template" onClick={() => { setNT(t); setShowTemplateForm(true); }}><Edit3 size={12}/></button>
                              <button type="button" className="admin-icon-action admin-icon-delete" title="Delete route template" aria-label="Delete route template" onClick={async () => { if(window.confirm("Delete this route template?")) { await saveApi('templates', t, true); setTemplatesData(d=>d.filter(x=>x.id!==t.id)); } }}><SvgTrash size={12}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="pricing-table-footer">Showing {templatesData.length} of {templatesData.length} template{templatesData.length===1?'':'s'}</div>
                </div>

                {/* Blocked Dates */}
                <div id="pricing-availability" className="bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="m-0 text-[15px] font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">Blocked Dates</h3>
                    <button className="bg-transparent border-none cursor-pointer text-slate-900 dark:text-slate-100 text-lg hover:text-primary transition-colors" onClick={() => setShowBlockForm(v=>!v)}>⊕</button>
                  </div>
                  {showBlockForm && <div className="grid gap-2 mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                    <select value={newBlock.vehicleId} onChange={e=>setNB(x=>({...x,vehicleId:e.target.value}))} className="w-full border rounded-md p-2 text-xs bg-white dark:bg-slate-800"><option value="">All vehicles</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select>
                    <div className="grid grid-cols-2 gap-2"><input aria-label="Block start date" type="date" value={newBlock.from} onChange={e=>setNB(x=>({...x,from:e.target.value}))} className="border rounded-md p-2 text-xs bg-white dark:bg-slate-800"/><input aria-label="Block end date" type="date" value={newBlock.to} onChange={e=>setNB(x=>({...x,to:e.target.value}))} className="border rounded-md p-2 text-xs bg-white dark:bg-slate-800"/></div>
                    <input aria-label="Block reason" value={newBlock.reason} onChange={e=>setNB(x=>({...x,reason:e.target.value}))} placeholder="Reason" className="border rounded-md p-2 text-xs bg-white dark:bg-slate-800"/>
                    <button className="bg-primary text-on-primary rounded-md p-2 text-xs font-bold" onClick={()=>{ if(!newBlock.from || !newBlock.to) return setToast('Start and end dates are required.'); setBl(xs=>[{...newBlock,id:'block_'+Date.now()},...xs]); setNB({id:'',vehicleId:vehicles[0]?.id||'',from:'',to:'',reason:'Contract booking',units:1}); setShowBlockForm(false); setToast('Blocked date added.'); }}>Add Blocked Date</button>
                  </div>}
                  
                  <div className="flex flex-col gap-4 mb-5">
                    {blocks.length === 0 ? (
                       <div className="pricing-empty-block"><div>▦</div><span>No blocked dates.</span></div>
                    ) : blocks.slice(0, 3).map(block => {
                      const d = new Date(block.from);
                      const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                      const day = d.getDate();
                      return (
                        <div key={block.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div className="bg-red-100 dark:bg-red-900/30 rounded-md overflow-hidden min-w-[44px] text-center">
                            <div className="bg-red-300 dark:bg-red-800 text-red-900 dark:text-red-100 text-[11px] font-extrabold py-0.5 tracking-wide">{month}</div>
                            <div className="text-red-600 dark:text-red-400 text-sm font-black py-1 bg-white dark:bg-red-900/10">{day}</div>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{block.reason || "Fleet Block"}</div>
                            <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{vehicles.find(v=>v.id===block.vehicleId)?.name || 'Global Block'}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[12px] font-bold text-slate-900 dark:text-slate-100 uppercase">Availability records</span>
                      <span className="text-[12px] font-bold text-primary dark:text-primary-fixed uppercase">{blocks.length} loaded</span>
                    </div>
                    <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-primary rounded-full"></div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ROW 3: Seasonal Multipliers */}
              <div id="pricing-seasonal" onPointerDownCapture={() => recordFeatureUsage('seasonal')}>
                <div className="flex justify-between items-center mb-3">
                  <div><h2 className="m-0 text-[15px] font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">Seasonal Multipliers</h2><p className="pricing-section-subtitle">Apply time-based multipliers across all zones.</p></div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="bg-transparent border-none cursor-pointer text-slate-900 dark:text-slate-100 text-[13px] font-bold hover:text-primary transition-colors" onClick={()=>setToast(`${seasonalData.length} seasonal rule${seasonalData.length===1?'':'s'} configured.`)}><History size={13}/> View History</button>
                    <button className="bg-primary text-on-primary hover:opacity-90 transition-opacity" style={{border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }} onClick={() => setNS({ ...blankSeasonal, id: 'new_'+Date.now() })}><Plus size={13}/> Add Rule</button>
                  </div>
                </div>
                
                {/* Seasonal Multiplier Form */}
                {newSeasonal.id && (
                  <div className="p-5 bg-white dark:bg-slate-800 border-[1.5px] border-slate-200 dark:border-slate-700 rounded-xl mb-4 shadow-sm">
                    <h4 className="m-0 mb-4 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{newSeasonal.name ? "Edit Multiplier" : "New Multiplier Rule"}</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                         <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Name</label>
                         <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none" value={newSeasonal.name||""} onChange={e=>setNS(x=>({...x,name:e.target.value}))} />
                      </div>
                      <div>
                         <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Multiplier (e.g. 1.5)</label>
                         <input type="number" step="0.1" placeholder="Not used with override" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none" value={newSeasonal.multiplier ?? ''} onChange={e=>setNS(x=>({...x,multiplier:e.target.value===''?undefined:Number(e.target.value),overrideFare:null}))} />
                      </div>
                      <div>
                         <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Applicable Vehicle</label>
                         <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none" value={newSeasonal.applicableVehicles?.[0]||'Any'} onChange={e=>setNS(x=>({...x,applicableVehicles:[e.target.value]}))}><option value="Any">All vehicles</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select>
                      </div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Start Date & Time</label><input type="datetime-local" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs" value={(newSeasonal.startDate||'').slice(0,16)} onChange={e=>setNS(x=>({...x,startDate:e.target.value}))}/></div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">End Date & Time</label><input type="datetime-local" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs" value={(newSeasonal.endDate||'').slice(0,16)} onChange={e=>setNS(x=>({...x,endDate:e.target.value}))}/></div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Override Fare (£, optional)</label><input type="number" min="0" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs" value={newSeasonal.overrideFare ?? ''} onChange={e=>setNS(x=>({...x,overrideFare:e.target.value===''?null:Number(e.target.value),multiplier:e.target.value===''?(x.multiplier??1.2):undefined}))}/></div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Priority</label><input type="number" min="1" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs" value={newSeasonal.priority ?? 1} onChange={e=>setNS(x=>({...x,priority:Number(e.target.value)}))}/></div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Applicable Routes</label><input type="text" placeholder="Any or route IDs" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs" value={newSeasonal.applicableRoutes?.join(', ')||'Any'} onChange={e=>setNS(x=>({...x,applicableRoutes:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))}/></div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Status</label><select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs" value={newSeasonal.enabled===false?'inactive':'active'} onChange={e=>setNS(x=>({...x,enabled:e.target.value==='active',status:e.target.value}))}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button className="bg-primary text-on-primary hover:opacity-90 transition-opacity" style={{border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }} onClick={saveSeasonalRule}>{String(newSeasonal.id).startsWith('new_') ? 'Add Rule' : 'Done'}</button>
                      <button className="bg-slate-100 dark:bg-slate-700 border-none text-slate-900 dark:text-slate-100 py-1.5 px-3 rounded-md text-[12px] font-extrabold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={()=>setNS(blankSeasonal)}>Cancel</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-5 gap-4">
                  {seasonalData.length === 0 && !newSeasonal.id && (
                    <div style={{ background: darkMode ? "#111827" : "#fff", borderRadius: 12, border: `1px dashed ${darkMode ? "#334155" : "#cbd5e1"}`, padding: 24, gridColumn: "1 / -1", color: darkMode ? "#94A3B8" : "#64748b", fontSize: 13, textAlign: "center", cursor: "pointer" }} onClick={() => setNS({ ...blankSeasonal, id: 'new_'+Date.now() })}>+ Add your first Seasonal Multiplier Rule</div>
                  )}
                  {seasonalData.map(s => (
                    <div key={s.id} className="pricing-seasonal-rule-tab bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-5 flex flex-col shadow-sm">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <span className="py-1 px-2 bg-orange-100 dark:bg-slate-700 text-orange-700 dark:text-slate-200 rounded text-[11px] font-extrabold uppercase tracking-wide">{s.name || "Seasonal Rule"}</span>
                        <span className="text-xl font-black text-slate-900 dark:text-slate-100">{s.multiplier}x</span>
                      </div>
                      <div className="pricing-seasonal-date">{s.startDate ? new Date(`${s.startDate.split('T')[0]}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'Start date'} – {s.endDate ? new Date(`${s.endDate.split('T')[0]}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'End date'}</div>
                      <div className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed flex-1">Applies to {s.applicableVehicles?.join(', ')} across all zones.</div>
                      <div className="pricing-seasonal-rule-actions">
                        <button type="button" className="admin-icon-action admin-icon-edit" aria-label={`Edit ${s.name || 'seasonal rule'}`} title="Edit rule" onClick={() => { setNS(s); }}><Edit3 size={12}/></button>
                        <button type="button" className="admin-icon-action admin-icon-delete" aria-label={`Delete ${s.name || 'seasonal rule'}`} title="Delete rule" onClick={async()=>{ if (!window.confirm(`Delete ${s.name || 'this seasonal rule'}?`)) return; await saveApi('seasonal', s, true); setSeasonalData(data=>data.filter(rule=>rule.id!==s.id)); setToast('Seasonal rule deleted.'); }}><SvgTrash size={12}/></button>
                      </div>
                    </div>
                  ))}
                  {/* Fill empty spaces with functional ghost cards */}
                  {seasonalData.length > 0 && seasonalData.length < 5 && Array.from({ length: 5 - seasonalData.length }).map((_, i) => (
                    <div key={i} className="pricing-seasonal-add-tab" style={{ background: darkMode ? "transparent" : "#fafafa", borderRadius: 12, border: `1px dashed ${darkMode ? "#334155" : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center", color: darkMode ? "#64748b" : "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 120 }} onClick={() => setNS({ ...blankSeasonal, id: 'new_'+Date.now() })}>
                       + Add Rule
                    </div>
                  ))}
                </div>
              </div>

              {/* ROW 4: Dynamic Pricing Matrix */}
              <div id="pricing-matrix" onPointerDownCapture={() => recordFeatureUsage('matrix')} className="bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 mt-1 shadow-sm overflow-hidden">
                <div className="p-5 flex justify-between items-start border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: darkMode ? "#F3F4F6" : "#0f172a", marginBottom: 4 }}>Dynamic Pricing Matrix</h3>
                    <p className="m-0 text-[13px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Fleet-wide cross-calculation based on demand and distance.</p>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                    {['global','fleet'/*,'city'*/].map(view=><button key={view} onClick={()=>{setMatrixView(view); setShowMatrixForm(false);}} className={`${matrixView===view?'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm':'bg-transparent text-slate-500 dark:text-slate-400'} border-none py-1 px-3 rounded-md text-[12px] font-bold`}>{view==='global'?'Global':view==='fleet'?'By Fleet':'By City'}</button>)}
                  </div>
                </div>
                
                {showMatrixForm && (
                  <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="m-0 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{newMatrix.id ? 'Edit Matrix Rule' : 'New Matrix Rule'} ({matrixView === 'global' ? 'Global Scope' : matrixView === 'fleet' ? 'Fleet Specific' : 'City to City'})</h4>
                      <div className="text-[12px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded">Rule Type is set by active tab above</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                      <div>
                         <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Target Vehicle</label>
                         <select value={newMatrix.vehicleId||''} onChange={e=>setNM(x=>({...x,vehicleId:e.target.value}))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none">
                            {db.vehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Base Fare Drop (£)</label>
                         <input type="number" value={newMatrix.baseFare||0} onChange={e=>setNM(x=>({...x,baseFare:Number(e.target.value)}))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none" placeholder="e.g. 50" />
                      </div>
                      {matrixBands(newMatrix).map((band, bandIndex) => (
                        <div key={bandIndex}>
                          <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                            {band.max == null ? `${band.min}${distanceUnitShort}+` : `${band.min}-${band.max}${distanceUnitShort}`} Rate (£/{distanceUnitShort})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={band.rate ?? 0}
                            onChange={e=>setNM(current=>({
                              ...current,
                              distanceBands: matrixBands(current).map((existing, index) => index === bandIndex ? {...existing, rate:Number(e.target.value)} : existing),
                              extraMileageRate: bandIndex === 2 ? Number(e.target.value) : current.extraMileageRate
                            }))}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none"
                          />
                        </div>
                      ))}
                      {matrixView === 'city' && <>
                        <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">From City</label><input value={newMatrix.pickupArea||''} onChange={e=>setNM(x=>({...x,pickupArea:e.target.value}))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md" placeholder="e.g. Birmingham"/></div>
                        <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">To City</label><input value={newMatrix.dropArea||''} onChange={e=>setNM(x=>({...x,dropArea:e.target.value}))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md" placeholder="e.g. London"/></div>
                      </>}
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Trip Type</label><select value={newMatrix.tripType||'one-way'} onChange={e=>setNM(x=>({...x,tripType:e.target.value}))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs"><option value="one-way">One Way</option><option value="return">Return</option></select></div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Included Live {distanceUnitShort}</label><input type="number" min="0" value={newMatrix.includedLiveMileage??0} onChange={e=>setNM(x=>({...x,includedLiveMileage:Number(e.target.value)}))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs"/></div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Included Dead {distanceUnitShort}</label><input type="number" min="0" value={newMatrix.includedDeadMileage??0} onChange={e=>setNM(x=>({...x,includedDeadMileage:Number(e.target.value)}))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs"/></div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Waiting Charge (£/hr)</label><input type="number" min="0" step="0.5" value={newMatrix.waitingChargePerHour??0} onChange={e=>setNM(x=>({...x,waitingChargePerHour:Number(e.target.value)}))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs"/></div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Night Multiplier</label><input type="number" min="0" step="0.1" value={newMatrix.nightRateMultiplier??1} onChange={e=>setNM(x=>({...x,nightRateMultiplier:Number(e.target.value)}))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs"/></div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Weekend Multiplier</label><input type="number" min="0" step="0.1" value={newMatrix.weekendRateMultiplier??1} onChange={e=>setNM(x=>({...x,weekendRateMultiplier:Number(e.target.value)}))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs"/></div>
                      <div><label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Rule Status</label><select value={newMatrix.status||'active'} onChange={e=>setNM(x=>({...x,status:e.target.value}))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button className="bg-primary text-on-primary hover:opacity-90 transition-opacity" style={{border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }} onClick={saveMatrixRule}>{newMatrix.id ? 'Done' : 'Add Matrix Rule'}</button>
                      <button className="bg-slate-100 dark:bg-slate-700 border-none text-slate-900 dark:text-slate-100 py-1.5 px-3 rounded-md text-[12px] font-extrabold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={()=>setShowMatrixForm(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                <div className="p-5 overflow-x-auto">
                   <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_80px] gap-4 mb-4 min-w-[640px]">
                      <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{matrixView === 'city' ? 'City Route' : matrixView === 'fleet' ? 'Fleet / Tier' : 'Category / Tier'}</div>
                      {matrixHeaderBands.map((band, index) => <div key={index} className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{band.max == null ? `${band.min}${distanceUnitShort}+` : `${band.min}-${band.max}${distanceUnitShort}`}</div>)}
                      <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Base Drop</div>
                      <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Actions</div>
                   </div>

                   {matrixRulesForView.length === 0 ? (
                      <div style={{ color: darkMode ? "#94A3B8" : "#64748b", fontSize: 13, textAlign: "center", padding: 20 }}>No {matrixView === 'city' ? 'city' : matrixView === 'fleet' ? 'fleet' : 'global'} matrix rules configured.</div>
                   ) : matrixRulesForView.map((m, idx) => (
                      <div key={m.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_80px] gap-4 py-3 border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors px-2 -mx-2 rounded min-w-[640px]">
                         <div style={{ fontSize: 13, fontWeight: 700, color: darkMode ? "#F3F4F6" : "#0f172a", display: "flex", alignItems: "center" }}>{matrixView === 'city' ? `${m.pickupArea || 'Any city'} → ${m.dropArea || 'Any city'}` : matrixView === 'global' ? 'Global · All bookings' : (db.vehicles.find(v=>v.id===m.vehicleId)?.name || 'Standard Tier')}</div>
                         {matrixBands(m).map((band, bandIndex) => <div key={bandIndex} className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center">£{fmt(band.rate)}/{distanceUnitShort}</div>)}
                         <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center">£{fmt(m.baseFare)}</div>
                         <div className="flex items-center justify-end gap-2">
                           <button type="button" className="admin-icon-action admin-icon-edit" aria-label="Edit matrix rule" title="Edit rule" onClick={() => { setNM(m); setShowMatrixForm(true); }}><Edit3 size={12}/></button>
                           <button type="button" className="admin-icon-action admin-icon-delete" aria-label="Delete matrix rule" title="Delete rule" onClick={async () => { if(window.confirm("Delete this matrix rule?")) { await saveApi('matrix', m, true); setMatrixData(d=>d.filter(x=>x.id!==m.id)); } }}><SvgTrash size={12}/></button>
                         </div>
                      </div>
                   ))}
                   <div style={{ marginTop: 16 }}>
                      <button className="bg-slate-100 dark:bg-slate-700 border-none text-slate-900 dark:text-slate-100 py-1.5 px-3 rounded-md text-[12px] font-extrabold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => { setShowMatrixForm(!showMatrixForm); if(!showMatrixForm) setNM({...blankMatrix,vehicleId:vehicles[0]?.id||''}); }}>{showMatrixForm ? "Cancel" : <><Plus size={13}/> Add Matrix Rule</>}</button>
                   </div>
                </div>
              </div>

            </div>
          )}
{/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• FLEET & AVAILABILITY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {tab === "fleet" && (
            <div className="fleet-economics-page flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-900/50">
              
              <style>{`
                /* Hide number input spinners for a cleaner look */
                .hide-spinners::-webkit-outer-spin-button,
                .hide-spinners::-webkit-inner-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }
                .hide-spinners {
                  -moz-appearance: textfield;
                }
              `}</style>

              {/* Vehicle Selector row */}
              <div className="fleet-tier-row flex gap-3 overflow-x-auto pb-1 items-stretch">
                {vehicles.map((v, i) => {
                  const margin = Number(gv.marginWeekday ?? gv.profitMarginPct ?? 20);
                  return (
                    <div key={v.id} onClick={() => setActiveVehicleId(v.id)} className={`fleet-tier-card shrink-0 w-56 p-3 rounded-xl border-[1.5px] cursor-pointer transition-all duration-150 ${activeVehicleId === v.id ? "border-primary bg-primary/5 dark:bg-blue-900/20 dark:border-blue-400" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"}`}>
                      <div className="flex gap-2.5 items-center mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeVehicleId === v.id ? "bg-primary/10 dark:bg-blue-900/40" : "bg-slate-100 dark:bg-slate-700"}`}>
                          {v.emoji === "coach" ? <SvgCoach size={18} className={activeVehicleId === v.id ? "text-primary dark:text-blue-400" : "text-slate-500 dark:text-slate-400"} /> : v.emoji === "minibus" ? <SvgMinibus size={18} className={activeVehicleId === v.id ? "text-primary dark:text-blue-400" : "text-slate-500 dark:text-slate-400"} /> : <SvgBus size={18} className={activeVehicleId === v.id ? "text-primary dark:text-blue-400" : "text-slate-500 dark:text-slate-400"} />}
                        </div>
                        <div className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100 leading-tight flex-1">{v.name || "Tier"}</div>
                        {vehicles.length > 1 && (
                          <button type="button" className="fleet-tier-remove admin-icon-action admin-icon-delete" title={`Remove ${v.name || "tier"}`} aria-label={`Remove ${v.name || "tier"}`} onClick={e=>{
                            e.stopPropagation();
                            if (!window.confirm(`Delete ${v.name || "this tier"}?`)) return;
                            const remaining = vehicles.filter(x=>x.id!==v.id);
                            setV(remaining);
                            if (activeVehicleId === v.id) setActiveVehicleId(remaining[0]?.id || "");
                          }}><SvgTrash size={12} /></button>
                        )}
                      </div>
                      <div className="flex justify-between text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          <span>Margin <b className="text-emerald-600 dark:text-emerald-400">{margin.toFixed(1)}%</b></span>
                          <span>Count <b className="text-slate-900 dark:text-slate-100">{v.fleetCount || 1}</b></span>
                      </div>
                    </div>
                  );
                })}
                <button type="button" className="shrink-0 w-28 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-primary dark:text-primary-fixed text-[13px] font-extrabold hover:border-primary" onClick={()=>{
                  const source=vehicles[0]||{}; const id=`vehicle_${Date.now()}`;
                  const created=injectDefaults({...source,id,name:'New vehicle tier',description:'',emoji:'minibus',fleetCount:1,annualFixedCosts:(source.annualFixedCosts||[]).map((cost,index)=>({...cost,id:`${id}_cost_${index}`}))});
                  setV(list=>[...list,created]); setActiveVehicleId(id); setShowVehicleDetails(true);
                }}><Plus size={14}/> Add vehicle</button>
                {(() => {
                  const selectedVehicle = vehicles.find(v => v.id === activeVehicleId) || vehicles[0];
                  const selectedEconomics = eco.vehicleBreakdown.find(v => v.id === selectedVehicle?.id);
                  return <div className="fleet-top-breakeven">
                    <div className="fleet-top-breakeven-grid">
                      <div className="fleet-top-breakeven-primary"><strong>£{selectedEconomics?.minHirePerDay.toFixed(2) || "0.00"}</strong><span>Minimum hire per day</span></div>
                      <div><span>Overhead</span><strong>£{selectedEconomics?.dailyOverhead.toFixed(2) || "0.00"}</strong></div>
                      <div><span>Standing</span><strong>£{selectedEconomics?.dailyStanding.toFixed(2) || "0.00"}</strong></div>
                    </div>
                  </div>;
                })()}
              </div>

              {showVehicleDetails && (()=>{ const selected=vehicles.find(v=>v.id===activeVehicleId)||vehicles[0]; if(!selected)return null; return <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_180px_auto] gap-3 items-end p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                <div><label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-1">Tier name</label><input className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-2 text-xs font-bold" value={selected.name||''} onChange={e=>updateV(selected.id,'name',e.target.value)}/></div>
                <div><label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-1">Description</label><input className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-2 text-xs" value={selected.description||''} onChange={e=>updateV(selected.id,'description',e.target.value)}/></div>
                <div><label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-1">Vehicle icon</label><select className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-2 text-xs" value={selected.emoji||'bus'} onChange={e=>updateV(selected.id,'emoji',e.target.value)}><option value="minibus">Minibus</option><option value="bus">Bus</option><option value="coach">Coach</option></select></div>
                                  <div className="flex gap-2">
                    {selected.id.startsWith('vehicle_') && (
                      <button className="rounded-md bg-transparent border border-slate-200 dark:border-slate-600 px-3 py-2 text-[12px] font-extrabold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500" onClick={()=>{
                        const remaining = vehicles.filter(x=>x.id!==selected.id);
                        setV(remaining);
                        if (activeVehicleId === selected.id) setActiveVehicleId(remaining[0]?.id || "");
                        setShowVehicleDetails(false);
                      }}>Cancel</button>
                    )}
                    <button className="rounded-md bg-slate-100 dark:bg-slate-700 px-3 py-2 text-[12px] font-extrabold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600" onClick={()=>setShowVehicleDetails(false)}>Done</button>
                  </div>
              </div>})()}

              {/* Main Dense Grid */}
              {(() => {
                const activeV = vehicles.find(v => v.id === (vehicles.find(x => x.id === activeVehicleId) ? activeVehicleId : vehicles[0]?.id)) || vehicles[0];
                const ecoV = eco.vehicleBreakdown.find(v => v.id === activeV?.id);
                if (!activeV) return null;
                const marginPct = Number(gv.marginWeekday ?? gv.profitMarginPct ?? 20);
                const dailyCostTarget = ecoV?.minHirePerDay || 0;
                const dailyRevenueTarget = dailyCostTarget * (1 + marginPct / 100);
                const annualRevenueTarget = dailyRevenueTarget * (activeV.utilisationDays || 225);
                const annualCostTarget = dailyCostTarget * (activeV.utilisationDays || 225);
                const annualProfitTarget = annualRevenueTarget - annualCostTarget;
                const annualCostShare = annualRevenueTarget > 0 ? Math.min(100, annualCostTarget / annualRevenueTarget * 100) : 0;
                return (
                  <div className="fleet-economics-workspace grid grid-cols-[300px_1fr] gap-4">
                    
                    {/* LEFT COLUMN: Operations & Target */}
                    <div className="fleet-economics-left flex flex-col gap-4">
                        
                        {/* Minimum Target Hire Box (Ultra Dense) */}
                        <div className="fleet-inline-breakeven bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                          <div className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Breakeven Target</div>
                          <div className="text-4xl font-black text-slate-900 dark:text-slate-100 leading-none">£{ecoV?.minHirePerDay.toFixed(2) || "0.00"}</div>
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Minimum Hire per Day</div>
                          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg py-2.5 px-3 mt-4 flex justify-between">
                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Overhead</div>
                                <div className="text-[15px] text-primary dark:text-primary-fixed font-extrabold">£{ecoV?.dailyOverhead.toFixed(2) || "0.00"}</div>
                              </div>
                              <div className="w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                              <div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Standing</div>
                                <div className="text-[15px] text-slate-900 dark:text-slate-100 font-extrabold">£{ecoV?.dailyStanding.toFixed(2) || "0.00"}</div>
                              </div>
                          </div>
                        </div>

                        {/* Operational Variables (Compact List) */}
                        <div id="fleet-variables" onPointerDownCapture={() => recordFeatureUsage('fleetVariables')} className="fleet-operational-card bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                            <div className="fleet-operational-head">
                               <div>
                                 <div className="fleet-card-eyebrow">Operating assumptions</div>
                                 <div className="fleet-card-title">Fleet variables</div>
                               </div>
                               {/* settings icon removed */}
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <div className="fleet-range-control">
                                  <div className="flex justify-between mb-1">
                                    <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase">Fleet Count</label>
                                    <span className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100">{activeV.fleetCount} Units</span>
                                  </div>
                                  <input type="range" min="1" max="100" aria-label="Fleet count" value={activeV.fleetCount ?? 1} onChange={e=>{
                                      const fleetCount=Math.max(1,Number(e.target.value)||1);
                                      const sum=(activeV.annualFixedCosts||[]).reduce((s,x)=>s+(Number(x.amount)||0),0);
                                      setV(vs=>vs.map(vx=>vx.id===activeV.id?{...vx,fleetCount,standingCostPerDay:(sum/fleetCount)/(activeV.utilisationDays||225)}:vx));
                                    }} className="w-full h-1 accent-primary" />
                                </div>

                                <div className="fleet-range-control">
                                  <div className="flex justify-between mb-1">
                                    <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase">Annual Utilisation</label>
                                    <span className="text-[13px] font-extrabold text-primary dark:text-primary-fixed">{activeV.utilisationDays} Days</span>
                                  </div>
                                  <input type="range" min="1" max="365" aria-label="Annual utilisation days" value={activeV.utilisationDays ?? 225} onChange={e=>{
                                      const utilDays = Number(e.target.value) || 225;
                                      const sum = (activeV.annualFixedCosts||[]).reduce((s, x) => s + (Number(x.amount)||0), 0);
                                      const vs = vehicles.map(vx => vx.id === activeV.id ? { ...vx, utilisationDays: utilDays, standingCostPerDay: sum > 0 ? ((sum / (activeV.fleetCount||1)) / utilDays) : vx.standingCostPerDay } : vx);
                                      setV(vs);
                                    }} className="w-full h-1 accent-primary" />
                                </div>
                                
                                <div className="fleet-compact-row mt-1">
                                  <div className="fleet-compact-field">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Seats</label>
                                    <input className="hide-spinners w-8 bg-transparent border-none text-slate-900 dark:text-slate-100 text-[13px] font-extrabold outline-none text-right p-0" type="number" value={activeV.capacity} onChange={e=>updateV(activeV.id,"capacity",Number(e.target.value))} />
                                  </div>
                                  <div className="fleet-compact-field">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Mult.</label>
                                    <input className="hide-spinners w-9 bg-transparent border-none text-slate-900 dark:text-slate-100 text-[13px] font-extrabold outline-none text-right p-0" type="number" step="0.1" value={activeV.commercialWeight ?? 1} onChange={e=>updateV(activeV.id,"commercialWeight",Number(e.target.value))} />
                                  </div>
                                  <div className="fleet-compact-field">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">RATE/{distanceUnitShort}</label>
                                    <input aria-label="Commercial vehicle rate per kilometre" className="hide-spinners w-full bg-transparent border-none text-slate-900 dark:text-slate-100 text-[13px] font-extrabold outline-none text-right p-0 cursor-default" type="number" readOnly value={Number((((activeV.fuelPricePerLitre ?? gv?.fuelPricePerLitre ?? 1.52) / (activeV.fuelKpl || 1)) + ((activeV.maintenanceSetCost || 0) / (activeV.expectedMaintenanceLifeKm || 1)) + ((activeV.tyreSetCost || 0) / (activeV.expectedTyreLifeKm || 1))).toFixed(4))} title="Calculated automatically from variable costs" />
                                  </div>
                                </div>
                            </div>

                            <div className="fleet-operational-summary">
                              <div className="fleet-operational-summary-title">Cost snapshot</div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="fleet-operational-summary-item">
                                  <span>Per vehicle / year</span>
                                  <strong>£{Math.round(((activeV.annualFixedCosts||[]).reduce((sum, item)=>sum+(Number(item.amount)||0),0)) / Math.max(1, Number(activeV.fleetCount)||1)).toLocaleString()}</strong>
                                </div>
                                <div className="fleet-operational-summary-item">
                                  <span>Per operating day</span>
                                  <strong>£{((((activeV.annualFixedCosts||[]).reduce((sum, item)=>sum+(Number(item.amount)||0),0)) / Math.max(1, Number(activeV.fleetCount)||1)) / Math.max(1, Number(activeV.utilisationDays)||225)).toFixed(2)}</strong>
                                </div>
                              </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Cost Center */}
                    <div className="fleet-economics-right flex flex-col gap-4">
                      
                      {/* Fixed Costs Table (Sleek Spreadsheet Style) */}
                      <div id="fleet-fixed-costs" onPointerDownCapture={() => recordFeatureUsage('fixedCosts')} className="fleet-fixed-costs bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 flex flex-col shadow-sm overflow-hidden">
                          <div className="fleet-fixed-costs-head py-4 px-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <div className="fleet-card-eyebrow">Cost ledger</div>
                                <h3 className="fleet-card-title">Vehicle Overheads</h3>
                                <div className="fleet-card-description">Recurring costs carried by this vehicle tier</div>
                            </div>
                            <button className="fleet-add-cost" onClick={() => {
                                const newFc = [...(activeV.annualFixedCosts||[]), { id: Date.now(), name: "New Cost", amount: 0 }];
                                setV(vs => vs.map(vx => vx.id === activeV.id ? { ...vx, annualCosts: newFc, annualFixedCosts: newFc } : vx));
                                window.setTimeout(() => {
                                  const rows = document.querySelector('.fleet-fixed-cost-rows');
                                  if (rows) rows.scrollTop = rows.scrollHeight;
                                }, 0);
                            }}><Plus size={14}/> Add cost</button>
                          </div>
                          
                          <div className="p-0 bg-white dark:bg-slate-800">
                            <div className="fleet-cost-columns grid grid-cols-[1fr_120px_40px] gap-4 py-2.5 px-5 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <div>Standing Item</div>
                                <div className="text-right">Baseline (Annual)</div>
                                <div></div>
                            </div>
                            <div className="fleet-fixed-cost-rows">
                            {(activeV.annualFixedCosts || []).map((fc, idx) => (
                                <div key={fc.id || idx} className="fleet-cost-row grid grid-cols-[1fr_120px_40px] gap-4 items-center py-1.5 px-5 border-b border-slate-100 dark:border-slate-700/50">
                                  <input type="text" value={fc.name} onChange={e => {
                                      const newFc = [...(activeV.annualFixedCosts||[])];
                                      newFc[idx] = { ...newFc[idx], name: e.target.value };
                                      updateV(activeV.id, "annualFixedCosts", newFc);
                                  }} className="bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 text-xs font-semibold w-full py-1 placeholder-slate-400 dark:placeholder-slate-600" placeholder="e.g. Insurance" />
                                  
                                  <div className="flex items-center justify-end gap-1">
                                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">£</span>
                                      <input className="hide-spinners w-20 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 text-[15px] font-extrabold text-right py-1" type="number" value={fc.amount} onChange={e => {
                                        const newFc = [...(activeV.annualFixedCosts||[])];
                                        newFc[idx] = { ...newFc[idx], amount: Number(e.target.value) };
                                        const sum = newFc.reduce((s, x) => s + (Number(x.amount)||0), 0);
                                        const utilDays = activeV.utilisationDays || 225;
                                        const vs = vehicles.map(vx => vx.id === activeV.id ? { ...vx, annualCosts: newFc, annualFixedCosts: newFc, standingCostPerDay: (sum / (activeV.fleetCount||1)) / utilDays } : vx);
                                        setV(vs);
                                      }} />
                                  </div>

                                  <button type="button" title={`Remove ${fc.name || 'fixed cost'}`} aria-label={`Remove ${fc.name || 'fixed cost'}`} onClick={() => {
                                      const newFc = (activeV.annualFixedCosts||[]).filter((_, i) => i !== idx);
                                      const sum = newFc.reduce((s, x) => s + (Number(x.amount)||0), 0);
                                      const utilDays = activeV.utilisationDays || 225;
                                      const vs = vehicles.map(vx => vx.id === activeV.id ? { ...vx, annualCosts: newFc, annualFixedCosts: newFc,  } : vx);
                                      setV(vs);
                                  }} className="admin-icon-action admin-icon-delete"><SvgTrash size={12}/></button>
                              </div>
                          ))}
                          </div>
                          <div className="fleet-cost-total flex justify-between items-center py-4 px-5 bg-primary/5 dark:bg-primary/10">
                              <span className="text-[12px] font-extrabold text-primary dark:text-primary-fixed uppercase tracking-wide">Gross Standing Total</span>
                              <span className="text-lg font-black text-primary dark:text-primary-fixed">£{((activeV.annualFixedCosts||[]).reduce((s,x)=>s+(Number(x.amount)||0),0)).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Variable Costs Grid (4-Column Compact Style) */}
                      <div onPointerDownCapture={() => recordFeatureUsage('fleetVariables')} className="fleet-variable-costs grid grid-cols-4 gap-3">
                          <div className="bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-3 shadow-sm flex flex-wrap items-center justify-between gap-y-1.5">
                              <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">Fuel Economy</div>
                              <div className="flex-1 border-b-[2px] border-dotted border-slate-300/70 dark:border-slate-600/70 mx-2 relative top-[1px]"></div>
                              <div className="flex items-center shrink-0">
                              <div className="fleet-variable-value !w-auto flex items-center shrink-0">
                                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 pb-0.5 mr-0.5">£</span>
                                <input aria-label="Fuel price" className="variable-cost-input hide-spinners w-[26px] bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 font-bold font-sans p-0 text-right" type="number" step="0.01" value={activeV.fuelPricePerLitre ?? gv?.fuelPricePerLitre ?? 1.52} onChange={e=>updateV(activeV.id,"fuelPricePerLitre",Number(e.target.value))} />
                                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 pb-0.5 ml-0.5 mr-0.5">/L</span>
                                <div className="text-slate-300 dark:text-slate-600 font-light mx-0.5">/</div>
                                <input aria-label="Fuel economy" className="variable-cost-input hide-spinners w-[26px] bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 font-bold font-sans p-0 text-right" type="number" step="0.1" value={activeV.fuelKpl ?? 5} onChange={e=>updateV(activeV.id,"fuelKpl",Number(e.target.value))} />
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pb-0.5 ml-0.5">{gv?.distanceUnit === 'miles' ? 'mpl' : 'kpl'}</span>
                              </div>
                              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center shrink-0 ml-1.5 whitespace-nowrap border-l border-slate-200 dark:border-slate-700 pl-1.5 h-[36px]">
                                  = £{((activeV.fuelPricePerLitre ?? gv?.fuelPricePerLitre ?? 1.52) / (activeV.fuelKpl || 1)).toFixed(3)}/{distanceUnitShort}
                              </div>
                              </div>
                          </div>

                          <div className="bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-3 shadow-sm flex flex-wrap items-center justify-between gap-y-1.5">
                              <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">Maint. Lifecycle</div>
                              <div className="flex-1 border-b-[2px] border-dotted border-slate-300/70 dark:border-slate-600/70 mx-2 relative top-[1px]"></div>
                              <div className="flex items-center shrink-0">
                              <div className="fleet-variable-value !w-auto flex items-center shrink-0">
                                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 pb-0.5 mr-0.5">£</span>
                                <input aria-label="Maintenance set cost" className="variable-cost-input hide-spinners w-[32px] bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 font-bold font-sans p-0 text-right" type="number" min="0" value={activeV.maintenanceSetCost??0} onChange={e=>{
                                  const val = Number(e.target.value);
                                  setV(vs=>vs.map(v=>v.id===activeV.id?{...v, maintenanceSetCost: val, maintenanceCostPerKm: 0}:v));
                                }}/>
                                <div className="text-slate-300 dark:text-slate-600 font-light mx-0.5">/</div>
                                <input aria-label="Expected maintenance life" className="variable-cost-input hide-spinners w-[36px] bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 font-bold font-sans p-0 text-right" type="number" min="1" value={activeV.expectedMaintenanceLifeKm??60000} onChange={e=>{
                                  const val = Number(e.target.value);
                                  setV(vs=>vs.map(v=>v.id===activeV.id?{...v, expectedMaintenanceLifeKm: val, maintenanceCostPerKm: 0}:v));
                                }}/>
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pb-0.5 ml-0.5">{distanceUnitShort}</span>
                              </div>
                              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center shrink-0 ml-1.5 whitespace-nowrap border-l border-slate-200 dark:border-slate-700 pl-1.5 h-[36px]">
                                  = £{((activeV.maintenanceSetCost || 0) / (activeV.expectedMaintenanceLifeKm || 1)).toFixed(3)}/{distanceUnitShort}
                              </div>
                              </div>
                          </div>

                          <div className="bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-3 shadow-sm flex flex-wrap items-center justify-between gap-y-1.5">
                              <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">Tyre Lifecycle</div>
                              <div className="flex-1 border-b-[2px] border-dotted border-slate-300/70 dark:border-slate-600/70 mx-2 relative top-[1px]"></div>
                              <div className="flex items-center shrink-0">
                              <div className="fleet-variable-value !w-auto flex items-center shrink-0">
                                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 pb-0.5 mr-0.5">£</span>
                                <input aria-label="Tyre set cost" className="variable-cost-input hide-spinners w-[32px] bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 font-bold font-sans p-0 text-right" type="number" min="0" value={activeV.tyreSetCost??0} onChange={e=>{
                                  const val = Number(e.target.value);
                                  setV(vs=>vs.map(v=>v.id===activeV.id?{...v, tyreSetCost: val, tyreCostPerKm: 0}:v));
                                }}/>
                                <div className="text-slate-300 dark:text-slate-600 font-light mx-0.5">/</div>
                                <input aria-label="Expected tyre life" className="variable-cost-input hide-spinners w-[36px] bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 font-bold font-sans p-0 text-right" type="number" min="1" value={activeV.expectedTyreLifeKm??40000} onChange={e=>{
                                  const val = Number(e.target.value);
                                  setV(vs=>vs.map(v=>v.id===activeV.id?{...v, expectedTyreLifeKm: val, tyreCostPerKm: 0}:v));
                                }}/>
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pb-0.5 ml-0.5">{distanceUnitShort}</span>
                              </div>
                              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center shrink-0 ml-1.5 whitespace-nowrap border-l border-slate-200 dark:border-slate-700 pl-1.5 h-[36px]">
                                  = £{((activeV.tyreSetCost || 0) / (activeV.expectedTyreLifeKm || 1)).toFixed(3)}/{distanceUnitShort}
                              </div>
                              </div>
                          </div>

                          <div className="bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-3 shadow-sm flex flex-wrap items-center justify-between gap-y-1.5">
                              <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">Luggage Profit</div>
                              <div className="flex-1 border-b-[2px] border-dotted border-slate-300/70 dark:border-slate-600/70 mx-2 relative top-[1px]"></div>
                              <div className="flex items-center shrink-0">
                              <div className="fleet-variable-value !w-auto flex items-center gap-1 shrink-0">
                                  <input aria-label="Luggage profit multiplier" className="variable-cost-input hide-spinners w-[32px] bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 font-bold font-sans p-0 text-right" type="number" step="0.05" value={activeV.extraLuggageProfitPct ?? 0.2} onChange={e=>updateV(activeV.id,"extraLuggageProfitPct",Number(e.target.value))} />
                                  <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 pb-0.5">Mult.</span>
                              </div>
                              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1.5 whitespace-nowrap shrink-0 border-l border-slate-200 dark:border-slate-700 pl-1.5">Extra bag</div>
                              </div>
                          </div>
                      </div>

                        {/* Revenue Projections / System Context Card */}
                      <div className="fleet-profitability bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-dashed border-slate-300 dark:border-slate-600 p-5 flex justify-between items-center shadow-sm">
                          <div className="fleet-profitability-copy">
                             <div className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide mb-1">Fleet Profitability & Revenue</div>
                             <div className="text-[13px] text-slate-500 dark:text-slate-400">Calculations assume {activeV.utilisationDays} operating days at {(gv.marginWeekday ?? gv.profitMarginPct ?? 20)}% weekday margin</div>
                          </div>
                          <div className="text-right">
                             <div className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">Target Daily Revenue</div>
                             <div className="text-2xl font-black text-slate-900 dark:text-slate-100">£{(ecoV?.minHirePerDay * (1 + (gv.marginWeekday ?? gv.profitMarginPct ?? 20)/100)).toFixed(2) || "0.00"}</div>
                          </div>
                          <div className="fleet-profit-kpis">
                            <div><span>Daily revenue target</span><strong>£{dailyRevenueTarget.toFixed(2)}</strong></div>
                            <div><span>Gross margin</span><strong>{marginPct.toFixed(1)}%</strong></div>
                            <div><span>Annual revenue target</span><strong>£{Math.round(annualRevenueTarget).toLocaleString()}</strong></div>
                            <div><span>Annual profit target</span><strong>£{Math.round(annualProfitTarget).toLocaleString()}</strong></div>
                          </div>
                          <div className="fleet-margin-progress">
                            <div className="fleet-margin-label"><span>Margin progress</span><strong>{marginPct.toFixed(0)}%</strong></div>
                            <div className="fleet-margin-track"><span style={{ width: `${Math.min(100, marginPct * 2)}%` }} /></div>
                            <div className="fleet-margin-scale"><span>0%</span><span>Target {marginPct.toFixed(0)}%</span><span>50%</span></div>
                          </div>
                          <div className="fleet-revenue-chart">
                            <div className="fleet-revenue-chart-title">Revenue vs costs (annual)</div>
                            <div className="fleet-revenue-chart-body">
                              <div className="fleet-profit-donut" style={{ background: `conic-gradient(#A73746 0 ${annualCostShare}%, #2F6F67 ${annualCostShare}% 100%)` }}><div><strong>£{Math.round(annualRevenueTarget).toLocaleString()}</strong><span>Revenue</span></div></div>
                              <dl>
                                <div><dt><i className="revenue-dot" />Revenue</dt><dd>£{Math.round(annualRevenueTarget).toLocaleString()}</dd></div>
                                <div><dt><i className="cost-dot" />Costs</dt><dd>£{Math.round(annualCostTarget).toLocaleString()}</dd></div>
                                <div><dt><i className="profit-dot" />Profit</dt><dd>£{Math.round(annualProfitTarget).toLocaleString()}</dd></div>
                              </dl>
                            </div>
                          </div>
                      </div>

                    </div>
                </div>
                );
              })()}
            </div>
          )}
{/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SYSTEM SETTINGS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {tab === "settings" && (
            <div className="settings-page bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 rounded-xl p-6 transition-colors flex-1 overflow-y-auto">
              <style>{`
                .custom-places-auto input { background: transparent !important; color: inherit !important; border: none !important; width: 100% !important; outline: none !important; box-shadow: none !important; padding-left: 38px !important; }
                .dark .custom-places-auto input { color: white !important; }
                .custom-places-auto input::placeholder { color: #9CA3AF !important; }
              `}</style>
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h2 className="m-0 text-xl font-extrabold text-slate-900 dark:text-slate-100">Settings</h2>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Manage one area at a time. Choose a section below.</p>
                </div>
              </div>

              <div className={`settings-layout settings-section-${settingsSection} grid grid-cols-12 gap-4`}>
                {settingsSection === 'staff' && hasPermission('staff') && <StaffAccessPanel setToast={setToast}/>} 
                
                {/* ── CARD 1: Business Profile (Col-span 8) ── */}
                <div className="settings-business col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-5 relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-container dark:from-[#60A5FA] dark:to-[#3B82F6]" />
                  <div className="flex items-center gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Company Details</h3>
                      <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Legal and contact information</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Legal Entity Name</label>
                      <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none focus:border-primary transition-colors" value={operatorDetails.companyName} onChange={e=>setOperatorDetails(x=>({...x,companyName:e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">PSV Operator Licence</label>
                      <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none focus:border-primary transition-colors" value={operatorDetails.operatorLicence} onChange={e=>setOperatorDetails(x=>({...x,operatorLicence:e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Notification Email</label>
                      <input type="email" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1.5 px-2.5 text-xs font-bold outline-none focus:border-primary transition-colors" value={operatorDetails.notificationEmail} onChange={e=>setOperatorDetails(x=>({...x,notificationEmail:e.target.value}))} />
                    </div>
                  </div>
                </div>

                {/* ── CARD 2: Operations (Col-span 4) ── */}
                <div className="settings-operations col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div><h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Depot Setup</h3><p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Location and mileage units</p></div>
                  </div>
                  <div className="space-y-3 mb-4 hidden">
                    {roadCharges.map(charge => (
                      <div key={charge.key} className="flex justify-between items-center gap-3 pb-2.5 border-b border-outline-variant dark:border-[#1F2937] last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: charge.color }} />
                          <input
                            type="text"
                            className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 outline-none border-b border-transparent focus:border-primary dark:focus:border-[#60A5FA]"
                            value={charge.label}
                            onChange={event => setRoadCharges(rows => rows.map(row => row.key === charge.key ? { ...row, label: event.target.value } : row))}
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 dark:text-slate-400">£</span>
                            <input
                              type="number"
                              step="0.5"
                              className="w-12 bg-transparent text-right outline-none focus:border-b focus:border-primary dark:focus:border-[#60A5FA] text-on-surface dark:text-white"
                              value={charge.amount ?? 0}
                              onChange={event => setRoadCharges(rows => rows.map(row => row.key === charge.key ? { ...row, amount: Number(event.target.value) } : row))}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setRoadCharges(rows => rows.filter(row => row.key !== charge.key))}
                            className="admin-icon-action admin-icon-delete"
                            title={`Remove ${charge.label}`}
                            aria-label={`Remove ${charge.label}`}
                          >
                            <SvgTrash size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700/50">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Distance Unit</span>
                      <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1 px-2 text-xs font-bold outline-none" value={gv.distanceUnit || 'miles'} onChange={handleUnitChange}>
                        <option value="km">Kilometers</option>
                        <option value="miles">Miles</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700/50">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Depot Postcode</span>
                      <input type="text" className="w-28 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md py-1 px-2 text-xs font-bold outline-none focus:border-primary" value={operatorDetails.depotPostcode} onChange={e=>setOperatorDetails(x=>({...x,depotPostcode:e.target.value}))} />
                    </div>
                  </div>
                </div>

                {/* ── CARD 3a: Core Rates (Col-span 6) ── */}
                <div className="settings-pricing col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-fixed"><CalendarDays size={15}/></div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Core Rates</h3>
                    </div>
                    <select aria-label="Vehicle quotation tier" value={vehicles.some(vehicle=>vehicle.id===selectedPricingVehicleId)?selectedPricingVehicleId:vehicles[0]?.id||''} onChange={event=>setSelectedPricingVehicleId(event.target.value)} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{vehicles.map(vehicle=><option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</select>
                  </div>
                  {(()=>{const vehicle=selectedPricingVehicle;if(!vehicle)return null;const autoMinHire=eco.vehicleBreakdown.find(v=>v.id===vehicle.id)?.minHirePerDay;return <div className="vehicle-quotation-grid grid gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-100/80 p-2.5 dark:border-slate-700 dark:bg-slate-900" title="Auto-calculated from standing cost + overhead per day. Update fleet economics to change it.">
                      <span className="block min-h-[26px] text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Minimum hire (auto)</span>
                      <span className="mt-2 flex items-center border-b border-slate-300 pb-1 dark:border-slate-600">
                        <span className="min-w-0 w-full text-right text-sm font-extrabold text-slate-600 dark:text-slate-300">{(autoMinHire ?? vehicle.minimumHire ?? 0).toFixed(2)}</span>
                        <span className="ml-1 whitespace-nowrap text-[11px] font-bold text-slate-400">£</span>
                      </span>
                    </div>
                    {[
                    ['sellingRateOneWay','One-way rate',`£/${distanceUnitShort}`,0.01],
                    ['sellingRateReturn','Return rate',`£/${distanceUnitShort}`,0.01],
                    ['includedKmOneWay','Included one-way',distanceUnitShort,1],
                    ['includedKmReturn','Included return',distanceUnitShort,1]
                  ].map(([field,label,suffix,step])=><label key={field} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-700 dark:bg-slate-900/50"><span className="block min-h-[26px] text-[11px] font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-200">{label}</span><span className="mt-2 flex items-center border-b border-slate-300 pb-1 dark:border-slate-600"><input aria-label={`${vehicle.name} ${label}`} type="number" min="0" step={step} value={vehicle[field]??0} onChange={event=>updateV(vehicle.id,field,Math.max(0,Number(event.target.value)||0))} className="min-w-0 w-full bg-transparent text-right text-sm font-extrabold text-slate-900 outline-none dark:text-white"/><span className="ml-1 whitespace-nowrap text-[11px] font-bold text-slate-400">{suffix}</span></span></label>)}</div>})()}
                </div>

                {/* ── CARD 3b: Margins & Profit (Col-span 6) ── */}
                <div className="settings-margins col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-fixed"><Target size={15}/></div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Margins & Profit</h3>
                  </div>
                  <div className="vehicle-quotation-grid grid gap-2">
                    {[
                      ['marginWeekday','Gross margin','Weekday',30,'%'],
                      ['marginWeekend','Gross margin','Weekend',30,'%'],
                      ['marginHoliday','Gross margin','Holiday',30,'%'],
                      ['netMarginPct','Net margin','Minimum',5,'%'],
                      ['netProfitTarget','Net profit','Minimum',0,'£']
                    ].map(([key,label,context,fallback,suffix]) => (
                      <label key={key} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-700 dark:bg-slate-900/50">
                        <span className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-200">{label}</span>
                        <span className="mt-0.5 block text-[11px] font-semibold text-slate-400 dark:text-slate-500">{context}</span>
                        <span className="mt-2 flex items-center border-b border-slate-300 pb-1 dark:border-slate-600">
                          {suffix === '£' && <span className="mr-1 text-[13px] font-bold text-slate-400">£</span>}
                          <input aria-label={`${label} ${context}`} type="number" min={key === 'netMarginPct' ? 5 : 0} max={key === 'netProfitTarget' ? undefined : 95} step={key === 'netProfitTarget' ? 5 : 0.5} value={pricing[key] ?? gv[key] ?? fallback} onChange={e=>updatePricing(key,Number(e.target.value))} className="min-w-0 w-full bg-transparent text-right text-sm font-extrabold text-slate-900 outline-none dark:text-white"/>
                          {suffix === '%' && <span className="ml-1 text-[12px] font-bold text-slate-400">%</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* ── CARD 3c: Driver & Pricing Rules (Col-span 6) ── */}
                <div className="settings-driver-rules col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-fixed"><SvgUser size={15}/></div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Driver & Pricing Rules</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      ['driverWageWeekday','Driver wage - weekday',18,SvgUser],
                      ['driverWageWeekend','Driver wage - weekend',22,CalendarDays],
                      ['driverWageHoliday','Driver wage - holiday',25,Sun]
                    ].map(([key,label,fallback,Icon]) => (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
                        <div className="flex min-w-0 items-center gap-2"><Icon size={14} className="shrink-0 text-slate-400 dark:text-slate-500" /><span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{label}</span></div>
                        <div className="flex shrink-0 items-center gap-1"><span className="text-[13px] font-bold text-slate-400">£</span><input type="number" step="0.5" className="w-14 bg-transparent text-right outline-none border-b border-slate-300 dark:border-slate-600 focus:border-primary text-slate-900 dark:text-slate-100 font-bold" value={pricing[key] ?? gv[key] ?? fallback} onChange={e=>updatePricing(key,Number(e.target.value))}/><span className="text-[12px] font-bold text-slate-400">/hr</span></div>
                      </div>
                    ))}
                    {[
                      ['emptyLegThresholdKm','Empty-leg threshold',20,'km',MapPinned],
                      ['dualDriverThresholdHours','Daily driving limit',9,'hr',SlidersHorizontal],
                      ['waitingWageFactor','Waiting wage factor',0.75,'×',RefreshCw],
                      ['customerRangePct','Customer range uplift',12,'%',TrendingUp],
                      ['walkaroundCheckMinutes','Walkaround check (each way)',30,'min',Eye]
                    ].map(([key,label,fallback,suffix,Icon]) => (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
                        <div className="flex min-w-0 items-center gap-2"><Icon size={14} className="shrink-0 text-slate-400 dark:text-slate-500" /><span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{label}</span></div>
                        <div className="flex shrink-0 items-center gap-1"><input type="number" min="0" step={key==='waitingWageFactor'?0.05:1} className="w-14 bg-transparent text-right outline-none border-b border-slate-300 dark:border-slate-600 focus:border-primary text-slate-900 dark:text-slate-100 font-bold" value={key==='emptyLegThresholdKm' && gv.distanceUnit==='miles' ? Math.round(Number(pricing[key] ?? gv[key] ?? fallback) / 1.60934 * 100) / 100 : (pricing[key] ?? gv[key] ?? fallback)} onChange={e=>updatePricing(key,key==='emptyLegThresholdKm' && gv.distanceUnit==='miles' ? Number(e.target.value) * 1.60934 : Number(e.target.value))}/><span className="text-[12px] font-bold text-slate-400">{key==='emptyLegThresholdKm' && gv.distanceUnit==='miles' ? 'mi' : suffix}</span></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── CARD 4: Geospatial (Col-span 4) ── */}
                <div className="settings-geo col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-5 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Depot / Yard Location</h3>
                  </div>
                  <div className="mb-3 custom-places-auto">
                    <PlacesInput value={depotLoc.address} mapsLoaded={mapsLoaded} onChange={updateDepotLocation} placeholder="Search yard address..." icon={<SvgDepot size={15} className="text-[#52525A] dark:text-[#9CA3AF] ml-1" />} />
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl relative overflow-hidden border border-slate-200 dark:border-slate-700 min-h-[200px] flex flex-col justify-end">
                    {mapsLoaded && depotLoc?.lat ? (
                      <DepotMapPreview lat={depotLoc.lat} lng={depotLoc.lng} darkMode={darkMode} />
                    ) : (
                      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900" />
                    )}
                  </div>
                </div>

                {/* ── CARD 5: Tolls (Col-span 6) ── */}
                <div className="settings-tolls col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-fixed"><MapPinned size={15}/></div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Road & Zone Charges</h3>
                  </div>
                  <div className="space-y-3 hidden">
                    {[
                      ["ulez","London ULEZ", "#10B981"],
                      ["birminghamCaz","Bham CAZ", "#60A5FA"],
                      ["dartford","Dartford", "#A22D3A"],
                      ["m6Toll","M6 Toll", "#F43F5E"]
                    ].map(([k,l,color])=>(
                      <div key={k} className="flex justify-between items-center pb-2.5 border-b border-outline-variant dark:border-[#1F2937] last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: color }} />
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{l}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 dark:text-slate-400">£</span>
                          <input type="number" step="0.5" className="w-12 bg-transparent text-right outline-none focus:border-b focus:border-primary dark:focus:border-[#60A5FA] text-on-surface dark:text-white" value={sr[k] ?? 0} onChange={e=>setRoadCharges(rows => rows.map(row => row.key === k ? { ...row, amount: Number(e.target.value) } : row))} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[380px] border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="pb-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">Charge</th>
                          <th className="pb-2 text-right text-[11px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">Amount</th>
                          <th className="pb-2 pl-3 text-right text-[11px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roadCharges.map(charge => (
                          <tr key={charge.key} className="border-b border-outline-variant last:border-0 dark:border-[#1F2937]">
                            <td className="py-2.5 pr-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: charge.color }} />
                                <input
                                  type="text"
                                  value={charge.label}
                                  onChange={event => updateRoadCharges(rows => rows.map(row => row.key === charge.key ? { ...row, label: event.target.value } : row))}
                                  className="min-w-0 flex-1 border-b border-transparent bg-transparent text-xs font-bold text-slate-900 outline-none focus:border-primary dark:text-slate-100"
                                  aria-label="Charge name"
                                />
                              </div>
                            </td>
                            <td className="py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-500 dark:text-slate-400">£</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={charge.amount ?? 0}
                                  onChange={event => updateRoadCharges(rows => rows.map(row => row.key === charge.key ? { ...row, amount: Number(event.target.value) } : row))}
                                  className="w-14 bg-transparent text-right text-xs outline-none focus:border-b focus:border-primary dark:text-white"
                                  aria-label={`${charge.label} amount`}
                                />
                              </div>
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <button type="button" onClick={() => updateRoadCharges(rows => rows.filter(row => row.key !== charge.key))} className="admin-icon-action admin-icon-delete" title={`Remove ${charge.label}`} aria-label={`Remove ${charge.label}`}>
                                <SvgTrash size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={() => updateRoadCharges(rows => [...rows, { key: makeRoadChargeKey("Custom charge", new Set(rows.map(row => row.key))), label: "Custom charge", color: "#64748B", amount: 0, locked: false }])} className="mt-4 flex w-max items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-[13px] font-extrabold uppercase text-primary transition-opacity hover:opacity-80 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-fixed">
                    <Plus size={13} /> Add Charge
                  </button>
                </div>

                {/* ── CARD 6: Overheads (Col-span 12) ── */}
                <div id="settings-overheads" className="settings-overheads col-span-12 bg-white dark:bg-slate-800 rounded-xl border-[1.5px] border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Company Annual Overheads</h3>
                        <p className="text-[12px] text-on-surface-variant dark:text-[#9CA3AF] mt-0.5">Aggregated and divided across fleet units.</p>
                      </div>
                    </div>
                    <div className="text-right bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-0.5">Total Fleet Overheads</span>
                      <span className="text-lg font-black text-primary dark:text-primary-fixed leading-none">£{totalOverheads.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {overheads.map((oh, index) => (
                      <div key={oh.id} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2 group">
                        <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[12px] font-extrabold shrink-0">{index + 1}</div>
                        <input type="text" className="flex-1 bg-transparent text-xs outline-none border-b border-transparent focus:border-primary text-slate-900 dark:text-slate-100 font-bold" placeholder="Cost Name" value={oh.label} onChange={e => setOH(os => os.map(x => x.id === oh.id ? {...x, label: e.target.value} : x))} />
                        <div className="flex items-center bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 shrink-0">
                          <span className="text-slate-500 dark:text-slate-400 text-[12px] font-bold mr-1">£</span>
                          <input type="number" className="w-16 bg-transparent text-xs font-bold outline-none text-right text-slate-900 dark:text-slate-100" value={oh.cost} onChange={e => setOH(os => os.map(x => x.id === oh.id ? {...x, cost: Number(e.target.value)} : x))} />
                        </div>
                        <button type="button" onClick={() => setOH(os => os.filter(x => x.id !== oh.id))} className="admin-icon-action admin-icon-delete shrink-0" title="Remove overhead" aria-label="Remove overhead">
                          <SvgTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setOH(os => [...os, {id: Date.now(), label:"New Overhead Item", cost:0}])} className="text-[13px] font-extrabold text-primary dark:text-primary-fixed hover:opacity-80 transition-opacity flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 w-max uppercase">
                    <Plus size={13}/> Add Overhead Item
                  </button>

                </div>

              </div>
            </div>
          )}

                    </div>
        </main>
        {editingBooking && bookingEditForm && typeof document !== "undefined" && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeBookingEditor(); }}>
            <form onSubmit={saveBookingEdits} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="booking-edit-title">
              <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                <div><h2 id="booking-edit-title" className="text-lg font-extrabold text-slate-900 dark:text-white">Edit quotation</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Update customer details and workflow status for #{editingBooking.id}. Pricing and route calculations are preserved.</p></div>
                <button type="button" onClick={closeBookingEditor} disabled={isSavingBooking} aria-label="Close quotation editor" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"><SvgClose size={17}/></button>
              </header>
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Customer name<input readOnly value={bookingEditForm.customerName} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400" /></label>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Email address<input readOnly type="email" value={bookingEditForm.customerEmail} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400" /></label>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Phone number<input readOnly value={bookingEditForm.customerPhone} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400" /></label>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Company<input readOnly value={bookingEditForm.customerCompany} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400" /></label>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Quotation status<select value={bookingEditForm.status} onChange={event => setBookingEditForm(form => ({ ...form, status: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-800 dark:text-white"><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select></label>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 md:col-span-2">Special requests<textarea rows={4} value={bookingEditForm.specialRequests} onChange={event => setBookingEditForm(form => ({ ...form, specialRequests: event.target.value }))} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-800 dark:text-white" /></label>
                {bookingEditError && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300 md:col-span-2" role="alert">{bookingEditError}</div>}
              </div>
              <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50"><button type="button" onClick={closeBookingEditor} disabled={isSavingBooking} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-white disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button><button type="submit" disabled={isSavingBooking} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:cursor-wait disabled:opacity-60">{isSavingBooking ? "Saving…" : "Save quotation"}</button></footer>
            </form>
          </div>,
          document.body
        )}
        {toast && (
          <div className="fixed top-6 right-6 z-[99999] bg-slate-800/95 text-slate-100 font-bold text-xs px-4 py-2 rounded-md shadow-lg border border-slate-700/80 transition-all duration-300">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Fleet Economics Panel ──────────────────────────────────────────────────────
function FleetEconomicsPanel({ eco, darkMode }) {
  const COLORS = [PX.navy600, PX.teal700, "#64748B", PX.amber500];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Per-vehicle breakdown table */}
      <div style={{ border: `1.5px solid ${darkMode ? "#374151" : PX.gray200}`,borderRadius:12,overflow:"hidden" }}>
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1.2fr",gap:0,
          background: darkMode ? "#111827" : PX.gray50,padding:"12px 14px",fontSize:13,fontWeight:800,
          color: darkMode ? "#9ca3af" : PX.gray600,textTransform:"uppercase",letterSpacing:.4 }}>
          <span>Vehicle tier</span>
          <span style={{ textTransform:"uppercase", textAlign:"center" }}>Units</span>
          <span style={{ textTransform:"uppercase", textAlign:"right" }}>Annual costs</span>
          <span style={{ textTransform:"uppercase", textAlign:"right" }}>Standing /day</span>
          <span style={{ textTransform:"uppercase", textAlign:"right" }}>Overhead /day</span>
          <span style={{ textTransform:"uppercase", textAlign:"right" }}>Min hire /day</span>
        </div>
        {eco.vehicleBreakdown.map((v,i)=>(
          <div key={v.id} style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1.2fr",gap:0,
            padding:"14px",borderTop:`1.5px solid ${PX.gray200}`,alignItems:"center", background: darkMode ? "#111827" : "#fff" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ width:10,height:10,borderRadius:"50%",background:COLORS[i%4],display:"inline-block",flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:15,fontWeight:700,color: darkMode ? "#f3f4f6" : PX.navy800 }}>
                  {v.emoji === "minibus" ? <SvgMinibus size={18} style={{ marginRight: 6 }} /> : v.emoji === "coach" ? <SvgCoach size={18} style={{ marginRight: 6 }} /> : <SvgBus size={18} style={{ marginRight: 6 }} />}
                  {v.name}
                </div>
                <div style={{ fontSize:13,color: darkMode ? "#6b7280" : PX.gray400,fontWeight:600, marginLeft: 24 }}>{v.utilDays} days · {v.utilRate}% utilisation</div>
              </div>
            </div>
            <div style={{ textAlign:"center" }}>
              <span style={{ fontSize:14,fontWeight:800,color: darkMode ? "#f3f4f6" : PX.navy800,
                background:PX.gray100,padding:"4px 10px",borderRadius:6 }}>{v.count}</span>
            </div>
            <div style={{ textAlign:"right",fontSize:15,color: darkMode ? "#9ca3af" : PX.gray600,fontWeight:600 }}>{fmtK(v.annualFixed)}</div>
            <div style={{ textAlign:"right",fontSize:15,fontWeight:700,color: darkMode ? "#f3f4f6" : PX.navy800 }}>£{v.dailyStanding.toFixed(2)}</div>
            <div style={{ textAlign:"right",fontSize:15,color:"#5b21b6",fontWeight:600 }}>£{v.dailyOverhead.toFixed(2)}</div>
            <div style={{ textAlign:"right" }}>
              <span style={{ fontSize:17,fontWeight:800,color:PX.amber500 }}>£{v.minHirePerDay.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Overhead allocation cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12 }}>
        {[
          ["Total company overheads",fmtK(eco.companyOverheads),"annual total","#f5f3ff","#ede9fe","#5b21b6","#7c3aed"],
          ["Overhead per unit",fmtK(eco.overheadPerUnit),`÷ ${eco.totalFleetUnits} total units`,"#f5f3ff","#ede9fe","#5b21b6","#7c3aed"],
          ["Total fleet units",`${eco.totalFleetUnits}`,`across ${eco.vehicleBreakdown.length} tiers`,PX.gray50,PX.gray200,PX.navy800,PX.gray400],
        ].map(([l,v,sub,bg,br,tc,sc])=>(
          <div key={l} style={{ background:bg,border:`1.5px solid ${br}`,borderRadius:9,padding:"14px" }}>
            <div style={{ fontSize:12,color:sc,fontWeight:800,textTransform:"uppercase",letterSpacing:.4,marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:20,fontWeight:800,color:tc }}>{v}</div>
            <div style={{ fontSize:13,color:sc,marginTop:2,fontWeight:500 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background:`linear-gradient(135deg,${PX.navy800},${PX.navy700})`,borderRadius:12,padding:"1.25rem 1.5rem" }}>
        <div style={{ fontSize:13,color:"#7baed4",fontWeight:800,textTransform:"uppercase",letterSpacing:.5,marginBottom:"1rem" }}>
          Calculated Standing Min Hire Charge / Day
        </div>
        <div style={{ display:"flex",gap:12,flexWrap:"wrap",marginBottom:"1rem" }}>
          {eco.vehicleBreakdown.map(v=>(
            <div key={v.id} style={{ flex:1,minWidth:135,background:"rgba(255,255,255,.08)",
              borderRadius:9,padding:"10px 14px",textAlign:"center" }}>
              <div style={{ fontSize:20,marginBottom:4 }}>
                {v.emoji === "minibus" ? <SvgMinibus size={22} color="#fff" /> : v.emoji === "coach" ? <SvgCoach size={22} color="#fff" /> : <SvgBus size={22} color="#fff" />}
              </div>
              <div style={{ fontSize:13,color:"#7baed4",marginBottom:6,fontWeight:600 }}>{v.name}</div>
              <div style={{ fontSize:22,fontWeight:800,color:PX.amber400 }}>£{v.minHirePerDay.toFixed(2)}</div>
              <div style={{ fontSize:12,color:"rgba(255,255,255,.35)",marginTop:4 }}>
                £{v.dailyStanding.toFixed(2)} + £{v.dailyOverhead.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height:1,background:"rgba(255,255,255,.12)",marginBottom:"0.75rem" }}/>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
          <div style={{ fontSize:14,color:"rgba(255,255,255,.6)" }}>
            Total Annual Operating Standing Fleet Cost: <strong style={{ color:"#fff" }}>{fmtK(eco.grandTotal)}</strong>
          </div>
          <div style={{ fontSize:13,color:"#7baed4",fontWeight:600 }}>
            Allocated Overhead: {fmtK(eco.overheadPerUnit)}/unit/yr · {eco.totalFleetUnits} units
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function AdminApp() {
  const [db, setDb] = useState(() => {
    try {
      const cached = window.localStorage.getItem(ADMIN_DB_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return { vehicles: [], globalVars: {}, annualOverheads: [], surcharges: {}, blockedDates: [] };
  });
  const [adminUser, setAdminUser] = useState(null);
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [authRequired, setAuthRequired] = useState(() => {
    return true;
  });
  const [authVersion, setAuthVersion] = useState(0);
  const backendStatusRef = useRef<'connecting' | 'online' | 'offline'>('connecting');
  const mapsLoaded = useGoogleMaps(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");

  useEffect(() => {
    try {
      const storedUser = window.localStorage.getItem(ADMIN_USER_KEY);
      if (storedUser) {
        setAdminUser(JSON.parse(storedUser));
        return;
      }
      const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
      const encodedPayload = token?.split('.')[1];
      if (encodedPayload) {
        const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
        const payload = JSON.parse(window.atob(base64Payload));
        setAdminUser({ name: "Administrator", email: payload.email || "" });
      }
    } catch {
      setAdminUser(null);
    }
  }, []);

  useEffect(() => {
    if (!adminUser || authRequired) return;
    const heartbeat = () => authenticatedFetch(API_BASE_URL + '/api/auth/activity', { method:'POST' }).catch(()=>{});
    heartbeat();
    const timer = window.setInterval(heartbeat, 5000);
    return () => window.clearInterval(timer);
  }, [adminUser?.id, authRequired]);
  
  useEffect(() => {
    let cancelled = false;
    let requestRunning = false;

    const checkBackend = async () => {
      if (authRequired && !window.localStorage.getItem(ADMIN_TOKEN_KEY)) return;
      if (requestRunning) return;
      requestRunning = true;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);

      try {
        // Once data has loaded, heartbeat only checks connectivity. Re-fetching the
        // configuration here would overwrite edits currently being made in forms.
        const alreadyOnline = backendStatusRef.current === 'online';

        if (alreadyOnline) {
          const healthResponse = await fetch(API_BASE_URL + "/health", { cache: "no-store", signal: controller.signal });
          if (!healthResponse.ok) throw new Error(`Backend health returned ${healthResponse.status}`);
          return;
        }

        // Bootstrap auth and configuration once. Once online, the interval above
        // only checks health so it cannot keep re-downloading /me and /config.
        const configResponse = await authenticatedFetch(API_BASE_URL + "/api/admin/config", { cache: "no-store", signal: controller.signal });

        if (configResponse.status === 401) {
          if (!cancelled) setAuthRequired(true);
          return;
        }
        if (!configResponse.ok) throw new Error(`Backend returned ${configResponse.status}`);
        const receivedData = await configResponse.json();
        if (!receivedData || !Array.isArray(receivedData.vehicles)) {
          throw new Error("Backend returned an invalid configuration payload");
        }
        const recovery = restoreMissingConfiguration(receivedData);
        const data = recovery.data;
        const canEditSettings = adminUser?.role === 'owner' || adminUser?.role === 'admin' || (adminUser?.permissions || []).includes('settings');
        if (recovery.changed && canEditSettings) {
          const restoreResponse = await authenticatedFetch(API_BASE_URL + "/api/admin/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vehicles: data.vehicles,
              globalVars: data.globalVars,
              surcharges: data.surcharges,
              annualOverheads: data.annualOverheads,
              operatorDetails: data.operatorDetails
            }),
            signal: controller.signal
          });
          if (!restoreResponse.ok) throw new Error("Unable to restore missing backend configuration");
        }
        if (!cancelled) {
          const freshDb = {
            ...data,
            vehicles: data.vehicles,
            globalVars: data.globalVars || {},
            annualOverheads: Array.isArray(data.annualOverheads) ? data.annualOverheads : [],
            surcharges: data.surcharges || {},
            blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : []
          };
          setDb(freshDb);
          try { window.localStorage.setItem(ADMIN_DB_CACHE_KEY, JSON.stringify(freshDb)); } catch {}
          setAuthRequired(false);
          backendStatusRef.current = 'online';
          setBackendStatus('online');
        }
      } catch {
        if (!cancelled) {
          setDb({ vehicles: [], globalVars: {}, annualOverheads: [], surcharges: {}, blockedDates: [] });
          backendStatusRef.current = 'offline';
          setBackendStatus('offline');
        }
      } finally {
        window.clearTimeout(timeout);
        requestRunning = false;
      }
    };

    checkBackend();
    const heartbeat = window.setInterval(checkBackend, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
    };
  }, [authVersion, adminUser?.role, authRequired]);

  const handleAuthenticated = user => {
    if (user) setAdminUser(user);
    setAuthRequired(false);
    backendStatusRef.current = 'connecting';
    setBackendStatus('connecting');
    setAuthVersion(version => version + 1);
  };

  const handleLogout = async () => {
    await authenticatedFetch(API_BASE_URL + '/api/auth/logout', { method:'POST' }).catch(()=>{});
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.localStorage.removeItem(ADMIN_USER_KEY);
    window.localStorage.removeItem(ADMIN_DB_CACHE_KEY);
    setAdminUser(null);
    setDb({ vehicles: [], globalVars: {}, annualOverheads: [], surcharges: {}, blockedDates: [] });
    setAuthRequired(true);
    backendStatusRef.current = 'connecting';
    setBackendStatus('connecting');
  };

  if (authRequired) {
    return <><GlobalStyle/><AdminAuthGate onAuthenticated={handleAuthenticated}/></>;
  }

  return (
    <>
      <GlobalStyle/>
      <div style={{ minHeight:"100vh" }}>
        <AdminDashboard
          // Preserve unsaved form state across transient health-check failures;
          // only remount when the initial configuration becomes ready.
          key={backendStatus === 'connecting' ? 'connecting' : 'ready'}
          db={db}
          mapsLoaded={mapsLoaded}
          backendOnline={backendStatus === 'online'}
          onLogout={handleLogout}
          adminUser={adminUser}
        />
      </div>
    </>
  );
}









