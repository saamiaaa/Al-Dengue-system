"use client";

import React, { useState, useMemo } from "react";
import SidebarControls from "./Components/SidebarControls";
import {
  AlertTriangle,
  BedDouble,
  Droplets,
  TestTube2,
  SprayCan,
  ArrowRightLeft,
  TrendingDown,
  Send,
  Copy,
  Printer,
  CheckCircle2,
  X,
} from "lucide-react";

// Offline Deterministic Baseline Data (Representative high-risk wards across all 5 cities)
const BASELINE_WARDS = [
  { ward_id: "DNCC_Ward_01", city: "Dhaka North", pop_density: 68500, water_logging: 0.89, predicted_cases: 145, bed_capacity: 95 },
  { ward_id: "DNCC_Ward_05", city: "Dhaka North", pop_density: 61200, water_logging: 0.82, predicted_cases: 112, bed_capacity: 85 },
  { ward_id: "DNCC_Ward_12", city: "Dhaka North", pop_density: 44000, water_logging: 0.55, predicted_cases: 42, bed_capacity: 90 },
  { ward_id: "DSCC_Ward_02", city: "Dhaka South", pop_density: 74200, water_logging: 0.92, predicted_cases: 168, bed_capacity: 110 },
  { ward_id: "DSCC_Ward_08", city: "Dhaka South", pop_density: 58900, water_logging: 0.78, predicted_cases: 98, bed_capacity: 80 },
  { ward_id: "DSCC_Ward_15", city: "Dhaka South", pop_density: 41500, water_logging: 0.49, predicted_cases: 36, bed_capacity: 95 },
  { ward_id: "CCC_Ward_01", city: "Chattogram", pop_density: 64024, water_logging: 0.87, predicted_cases: 124, bed_capacity: 80 },
  { ward_id: "CCC_Ward_04", city: "Chattogram", pop_density: 48200, water_logging: 0.64, predicted_cases: 58, bed_capacity: 75 },
  { ward_id: "CCC_Ward_09", city: "Chattogram", pop_density: 37500, water_logging: 0.45, predicted_cases: 28, bed_capacity: 85 },
  { ward_id: "GCC_Ward_01", city: "Gazipur", pop_density: 51000, water_logging: 0.81, predicted_cases: 84, bed_capacity: 55 },
  { ward_id: "GCC_Ward_03", city: "Gazipur", pop_density: 35400, water_logging: 0.52, predicted_cases: 31, bed_capacity: 60 },
  { ward_id: "NCC_Ward_01", city: "Narayanganj", pop_density: 56300, water_logging: 0.85, predicted_cases: 92, bed_capacity: 60 },
  { ward_id: "NCC_Ward_05", city: "Narayanganj", pop_density: 40043, water_logging: 0.90, predicted_cases: 48, bed_capacity: 65 },
];

export default function Home() {
  // Global Sidebar States
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedWard, setSelectedWard] = useState("ALL");
  const [stockPercentage, setStockPercentage] = useState(100);
  const [totalCrews, setTotalCrews] = useState(60);
  const [isOfflineMode, setIsOfflineMode] = useState(true); // Deterministic local engine active

  // Active Tab State
  const [activeTab, setActiveTab] = useState("allocation"); // 'allocation' | 'overflow' | 'simulator'

  // Vector Control Simulator State: { [ward_id]: deployed_crews }
  const [deployedCrews, setDeployedCrews] = useState({
    DSCC_Ward_02: 4,
    DNCC_Ward_01: 3,
    CCC_Ward_01: 3,
  });

  // Dispatch Modal State
  const [dispatchWard, setDispatchWard] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  const handleResetDefaults = () => {
    setSelectedCity("ALL");
    setSelectedWard("ALL");
    setStockPercentage(100);
    setTotalCrews(60);
  };

  // 1. Constrained Resource Allocation Engine (Prioritizes High-Risk + High-Density Wards)
  const allocatedData = useMemo(() => {
    // Calculate raw requirements per ward (derived from dataset ratios: ~2.4 saline, ~1.15 kits, ~0.35 beds per case)
    const enriched = BASELINE_WARDS.map((w) => {
      const reqSaline = Math.round(w.predicted_cases * 2.4);
      const reqKits = Math.round(w.predicted_cases * 1.15);
      const reqBeds = Math.round(w.predicted_cases * 0.65);
      const priorityScore = w.predicted_cases * (w.pop_density / 50000) * (1 + w.water_logging);
      return { ...w, reqSaline, reqKits, reqBeds, priorityScore };
    });

    // Sort descending by priorityScore so high-risk, dense wards get stock first under scarcity
    const sorted = [...enriched].sort((a, b) => b.priorityScore - a.priorityScore);

    const totalReqSaline = sorted.reduce((acc, w) => acc + w.reqSaline, 0);
    const totalReqKits = sorted.reduce((acc, w) => acc + w.reqKits, 0);

    let remSaline = Math.round(totalReqSaline * (stockPercentage / 100));
    let remKits = Math.round(totalReqKits * (stockPercentage / 100));
    let remCrews = totalCrews;

    const totalPriority = sorted.reduce((acc, w) => acc + w.priorityScore, 0);

    return sorted.map((w) => {
      // Priority-weighted allocation under scarcity
      const allocSaline = Math.min(w.reqSaline, remSaline);
      remSaline -= allocSaline;

      const allocKits = Math.min(w.reqKits, remKits);
      remKits -= allocKits;

      const idealCrews = Math.max(1, Math.round((w.priorityScore / totalPriority) * totalCrews));
      const allocCrews = Math.min(idealCrews, remCrews);
      remCrews -= allocCrews;

      const salineDeficit = w.reqSaline - allocSaline;
      const kitDeficit = w.reqKits - allocKits;
      const hasDeficit = salineDeficit > 0 || kitDeficit > 0;

      const riskTier =
        w.predicted_cases >= 120
          ? "Critical"
          : w.predicted_cases >= 80
          ? "High"
          : w.predicted_cases >= 40
          ? "Medium"
          : "Low";

      return {
        ...w,
        allocSaline,
        allocKits,
        allocCrews,
        salineDeficit,
        kitDeficit,
        hasDeficit,
        riskTier,
      };
    });
  }, [stockPercentage, totalCrews]);

  // Filtered wards for display
  const visibleWards = useMemo(() => {
    return allocatedData.filter((w) => {
      if (selectedCity !== "ALL" && w.city !== selectedCity) return false;
      if (selectedWard !== "ALL" && w.ward_id !== selectedWard) return false;
      return true;
    });
  }, [allocatedData, selectedCity, selectedWard]);

  // 2. Intra-City Hospital Surge & Cross-Ward Overflow Routing
  const overflowRouting = useMemo(() => {
    const cities = [...new Set(BASELINE_WARDS.map((w) => w.city))];
    const routes = [];
    const citySummary = [];

    cities.forEach((city) => {
      if (selectedCity !== "ALL" && city !== selectedCity) return;
      const cityWards = allocatedData.filter((w) => w.city === city);

      const totalCap = cityWards.reduce((s, w) => s + w.bed_capacity, 0);
      const totalDemand = cityWards.reduce((s, w) => s + w.reqBeds, 0);

      const deficitWards = cityWards
        .filter((w) => w.reqBeds > w.bed_capacity)
        .map((w) => ({ ...w, overflow: w.reqBeds - w.bed_capacity }));

      const surplusWards = cityWards
        .filter((w) => w.bed_capacity > w.reqBeds)
        .map((w) => ({ ...w, spare: w.bed_capacity - w.reqBeds }));

      deficitWards.forEach((dw) => {
        let needed = dw.overflow;
        surplusWards.forEach((sw) => {
          if (needed > 0 && sw.spare > 0) {
            const transfer = Math.min(needed, sw.spare);
            routes.push({
              city,
              fromWard: dw.ward_id,
              toWard: sw.ward_id,
              patientsRouted: transfer,
              remainingSurplus: sw.spare - transfer,
            });
            sw.spare -= transfer;
            needed -= transfer;
          }
        });
        if (needed > 0) {
          routes.push({
            city,
            fromWard: dw.ward_id,
            toWard: "UNMET REGIONAL SURGE",
            patientsRouted: needed,
            remainingSurplus: 0,
            unmet: true,
          });
        }
      });

      citySummary.push({
        city,
        totalCap,
        totalDemand,
        utilizationPct: Math.round((totalDemand / totalCap) * 100),
        headroom: Math.max(0, totalCap - totalDemand),
      });
    });

    return { routes, citySummary };
  }, [allocatedData, selectedCity]);

  // 3. "What-If" Vector Control Impact Simulator (2-to-4-week downstream ML projection)
  const simulationResults = useMemo(() => {
    return visibleWards
      .map((w) => {
        const crewsAssigned = deployedCrews[w.ward_id] || 0;
        // Diminishing returns curve driven by water_logging_risk & pop_density
        const effectiveness = 0.14 * (0.6 + w.water_logging * 0.5);
        const reductionFactor = 1 - Math.exp(-effectiveness * crewsAssigned);
        const casesPrevented = Math.round(w.predicted_cases * reductionFactor * 0.65);
        const postCases = w.predicted_cases - casesPrevented;
        const bedsSaved = Math.round(casesPrevented * 0.65);
        const salineSaved = Math.round(casesPrevented * 2.4);
        const roiPerCrew = crewsAssigned > 0 ? (casesPrevented / crewsAssigned).toFixed(1) : "0.0";

        return {
          ...w,
          crewsAssigned,
          casesPrevented,
          postCases,
          bedsSaved,
          salineSaved,
          roiPerCrew: parseFloat(roiPerCrew),
        };
      })
      .sort((a, b) => b.roiPerCrew - a.roiPerCrew);
  }, [visibleWards, deployedCrews]);

  const updateCrewCount = (wardId, delta) => {
    setDeployedCrews((prev) => {
      const current = prev[wardId] || 0;
      const next = Math.max(0, Math.min(15, current + delta));
      return { ...prev, [wardId]: next };
    });
  };

  // 4. Generate SMS / WhatsApp Dispatch Text
  const getDispatchText = (w) => {
    return `[DENGUE COMMAND ALERT - ${w.city.toUpperCase()}]
Ward: ${w.ward_id} | Risk: ${w.riskTier.toUpperCase()}
2-4 Wk Forecast: ${w.predicted_cases} Cases
Allocated Supplies (Stock @ ${stockPercentage}%):
- Saline Bags: ${w.allocSaline}/${w.reqSaline} ${w.salineDeficit > 0 ? `(DEFICIT: -${w.salineDeficit})` : "(OK)"}
- Diagnostic Kits: ${w.allocKits}/${w.reqKits} ${w.kitDeficit > 0 ? `(DEFICIT: -${w.kitDeficit})` : "(OK)"}
- Hospital Beds Req: ${w.reqBeds} (Local Cap: ${w.bed_capacity})
- Spraying Crews Assigned: ${w.allocCrews} Teams
Action: Immediate larvicide fogging in high water-logging zones.`;
  };

  const handleCopySms = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Summary KPIs
  const totalCases = visibleWards.reduce((s, w) => s + w.predicted_cases, 0);
  const totalSalineAlloc = visibleWards.reduce((s, w) => s + w.allocSaline, 0);
  const totalSalineReq = visibleWards.reduce((s, w) => s + w.reqSaline, 0);
  const deficitWardCount = visibleWards.filter((w) => w.hasDeficit).length;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Left Sidebar Controls */}
      <SidebarControls
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        selectedWard={selectedWard}
        setSelectedWard={setSelectedWard}
        stockPercentage={stockPercentage}
        setStockPercentage={setStockPercentage}
        totalCrews={totalCrews}
        setTotalCrews={setTotalCrews}
        isOfflineMode={isOfflineMode}
        onResetDefaults={handleResetDefaults}
      />

      {/* Main Operational Dashboard */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Urban Dengue Outbreak & Resource Dispatch System
            </h1>
            <p className="text-sm text-slate-500">
              2-to-4-Week Forecast, Scarcity Optimization & Intra-City Surge Routing
            </p>
          </div>
          <button
            onClick={() => setIsOfflineMode(!isOfflineMode)}
            className="self-start px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
          >
            Toggle Engine Mode ({isOfflineMode ? "Offline Safe" : "Live API"})
          </button>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Projected Cases (2-4 Wks)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCases.toLocaleString()}</p>
            <p className="text-xs text-rose-600 mt-1">Across {visibleWards.length} active wards</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-medium text-slate-500 uppercase">Saline Allocation</p>
              <Droplets className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {totalSalineAlloc.toLocaleString()}{" "}
              <span className="text-sm font-normal text-slate-400">/ {totalSalineReq.toLocaleString()}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Stock level at {stockPercentage}%</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-medium text-slate-500 uppercase">Critical Deficit Wards</p>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">{deficitWardCount}</p>
            <p className="text-xs text-slate-500 mt-1">Cannot meet 100% supply demand</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs font-medium text-slate-500 uppercase">Overflow Transfers</p>
              <ArrowRightLeft className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {overflowRouting.routes.reduce((s, r) => s + r.patientsRouted, 0)} Patients
            </p>
            <p className="text-xs text-slate-500 mt-1">Intra-city bed balancing</p>
          </div>
        </div>

        {/* Module Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab("allocation")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "allocation"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            1. Constrained Resource Allocation
          </button>
          <button
            onClick={() => setActiveTab("overflow")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "overflow"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            2. Hospital Surge & Overflow Routing
          </button>
          <button
            onClick={() => setActiveTab("simulator")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "simulator"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            3. &ldquo;What-If&rdquo; Vector Control Simulator
          </button>
        </div>

        {/* TAB 1: CONSTRAINED RESOURCE ALLOCATION & DISPATCH */}
        {activeTab === "allocation" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">
                Priority-Ranked Ward Supply & Crew Allocation
              </h2>
              <span className="text-xs text-slate-500">
                Sorted by Risk × Population Density × Water-Logging Index
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Ward & Density</th>
                    <th className="py-3 px-4">Risk & Cases</th>
                    <th className="py-3 px-4">Saline (Alloc/Req)</th>
                    <th className="py-3 px-4">Test Kits (Alloc/Req)</th>
                    <th className="py-3 px-4">Beds (Req/Cap)</th>
                    <th className="py-3 px-4">Crews</th>
                    <th className="py-3 px-4">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleWards.map((w) => (
                    <tr key={w.ward_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{w.ward_id}</div>
                        <div className="text-xs text-slate-500">
                          {w.city} • {w.pop_density.toLocaleString()}/km²
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${
                            w.riskTier === "Critical"
                              ? "bg-red-100 text-red-700"
                              : w.riskTier === "High"
                              ? "bg-orange-100 text-orange-700"
                              : w.riskTier === "Medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {w.riskTier} ({w.predicted_cases})
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className={w.salineDeficit > 0 ? "text-red-600 font-bold" : "text-slate-800"}>
                          {w.allocSaline}
                        </span>{" "}
                        / {w.reqSaline}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className={w.kitDeficit > 0 ? "text-red-600 font-bold" : "text-slate-800"}>
                          {w.allocKits}
                        </span>{" "}
                        / {w.reqKits}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className={w.reqBeds > w.bed_capacity ? "text-amber-600 font-bold" : "text-slate-800"}>
                          {w.reqBeds}
                        </span>{" "}
                        / {w.bed_capacity}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 px-2 py-1 rounded">
                          <SprayCan className="w-3 h-3 text-rose-600" /> {w.allocCrews}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {w.hasDeficit ? (
                            <span className="px-2 py-0.5 text-[11px] font-bold bg-red-600 text-white rounded">
                              DEFICIT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 rounded">
                              FULFILLED
                            </span>
                          )}
                          <button
                            onClick={() => setDispatchWard(w)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-md"
                          >
                            <Send className="w-3 h-3" /> Dispatch
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: HOSPITAL SURGE & CROSS-WARD OVERFLOW ROUTING */}
        {activeTab === "overflow" && (
          <div className="space-y-6">
            {/* City Bed Utilization Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overflowRouting.citySummary.map((c) => (
                <div key={c.city} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-800">{c.city}</h3>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        c.utilizationPct > 100
                          ? "bg-red-100 text-red-700"
                          : c.utilizationPct > 85
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {c.utilizationPct}% Utilized
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full ${
                        c.utilizationPct > 100 ? "bg-red-600" : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, c.utilizationPct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Demand: {c.totalDemand} beds</span>
                    <span>Headroom: {c.headroom} free</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Automated Intra-City Routing Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-rose-600" />
                Automated Intra-City Overflow Patient Transfers
              </h3>
              {overflowRouting.routes.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No cross-ward hospital overflow detected for the selected jurisdiction.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {overflowRouting.routes.map((r, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-wrap items-center justify-between p-3 rounded-lg border text-sm ${
                        r.unmet
                          ? "bg-red-50 border-red-200 text-red-900"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <span className="text-xs font-bold uppercase px-2 py-0.5 bg-white border rounded">
                          {r.city}
                        </span>
                        <span className="font-bold text-rose-700">{r.fromWard}</span>
                        <span>➔</span>
                        <span className="font-bold text-emerald-700">{r.toWard}</span>
                      </div>
                      <div className="text-xs font-semibold">
                        {r.patientsRouted} Patients Routed{" "}
                        {!r.unmet && `(Receiving Ward Spare: ${r.remainingSurplus} beds)`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: "WHAT-IF" VECTOR CONTROL IMPACT SIMULATOR */}
        {activeTab === "simulator" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-emerald-600" />
                  2-to-4-Week Larvicide & Fogging Impact Simulator
                </h2>
                <p className="text-xs text-slate-500">
                  Deploy crews to specific wards to simulate downstream case, bed & saline reductions ranked by ROI
                </p>
              </div>
              <div className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg">
                Total Cases Prevented:{" "}
                {simulationResults.reduce((s, w) => s + w.casesPrevented, 0)}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ROI Rank & Ward</th>
                    <th className="py-3 px-4">Deploy Crews</th>
                    <th className="py-3 px-4">Baseline ➔ Post-Control Cases</th>
                    <th className="py-3 px-4">Beds Saved</th>
                    <th className="py-3 px-4">Saline Saved</th>
                    <th className="py-3 px-4">ROI (Cases / Crew)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simulationResults.map((w, index) => (
                    <tr key={w.ward_id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-400 mr-2">#{index + 1}</span>
                        <span className="font-semibold text-slate-900">{w.ward_id}</span>
                        <span className="block text-xs text-slate-500 ml-6">
                          Water-Logging Risk: {(w.water_logging * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                          <button
                            onClick={() => updateCrewCount(w.ward_id, -1)}
                            className="w-6 h-6 rounded bg-white shadow text-slate-700 font-bold hover:bg-slate-50"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold text-xs">
                            {w.crewsAssigned}
                          </span>
                          <button
                            onClick={() => updateCrewCount(w.ward_id, 1)}
                            className="w-6 h-6 rounded bg-white shadow text-slate-700 font-bold hover:bg-slate-50"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className="text-slate-500 line-through mr-1">{w.predicted_cases}</span>
                        ➔ <span className="font-bold text-emerald-700">{w.postCases}</span>{" "}
                        {w.casesPrevented > 0 && (
                          <span className="text-emerald-600 font-semibold">
                            (-{w.casesPrevented})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                        -{w.bedsSaved} beds
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                        -{w.salineSaved} bags
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-800">
                          {w.roiPerCrew} cases/crew
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* 4. ACTIONABLE MULTI-CHANNEL DISPATCH MODAL (SMS/WhatsApp + Printable Brief) */}
      {dispatchWard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                Commissioner Dispatch Brief — {dispatchWard.ward_id}
              </h3>
              <button
                onClick={() => setDispatchWard(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="bg-slate-900 text-emerald-300 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed">
              {getDispatchText(dispatchWard)}
            </pre>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => handleCopySms(getDispatchText(dispatchWard))}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
              >
                {copiedText ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedText ? "Copied for SMS / WhatsApp!" : "Copy SMS / WhatsApp Alert"}
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}