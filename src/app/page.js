"use client";

import React, { useState, useEffect, useMemo } from "react";
import Navbar from "./Components/Navbar";
import SidebarControls from "./Components/SidebarControls";
import {
  fetchWardsData,
  fetchAllocation,
  fetchOverflow,
  fetchVectorSimulation,
  fetchDispatchNotices,
} from "../lib/api";
import {
  AlertTriangle,
  BedDouble,
  Droplets,
  SprayCan,
  ArrowRightLeft,
  TrendingDown,
  Send,
  Copy,
  Printer,
  CheckCircle2,
  X,
} from "lucide-react";

export default function Home() {
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedWard, setSelectedWard] = useState("ALL");
  const [horizon, setHorizon] = useState(2);
  const [selectedDate, setSelectedDate] = useState("2025-08-25");
  const [availableDates, setAvailableDates] = useState(["2025-08-25"]);

  const [stockPercentage, setStockPercentage] = useState(70);
  const [totalCrews, setTotalCrews] = useState(25);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [activeTab, setActiveTab] = useState("allocation");

  const [allocationRes, setAllocationRes] = useState(null);
  const [overflowRes, setOverflowRes] = useState(null);
  const [simRes, setSimRes] = useState(null);
  const [deployedCrews, setDeployedCrews] = useState({});

  const [dispatchData, setDispatchData] = useState(null);
  const [dispatchChannel, setDispatchChannel] = useState("whatsapp");
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    let active = true;
    fetchWardsData().then((res) => {
      if (!active) return;
      if (Array.isArray(res.available_dates) && res.available_dates.length > 0) {
        setAvailableDates(res.available_dates);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const [alloc, over] = await Promise.all([
        fetchAllocation({
          horizon,
          stock: stockPercentage,
          crews: totalCrews,
          date: selectedDate,
        }),
        fetchOverflow({ horizon, date: selectedDate }),
      ]);
      if (!active) return;
      setAllocationRes(alloc);
      setOverflowRes(over);
      setIsOfflineMode(Boolean(alloc.offline_fallback || over.offline_fallback));
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [horizon, stockPercentage, totalCrews, selectedDate]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const sim = await fetchVectorSimulation({
        date: selectedDate,
        deployed_crews: deployedCrews,
      });
      if (!active) return;
      setSimRes(sim);
      if (sim.offline_fallback) setIsOfflineMode(true);
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedDate, deployedCrews]);

  const handleResetDefaults = () => {
    setSelectedCity("ALL");
    setSelectedWard("ALL");
    setStockPercentage(100);
    setTotalCrews(25);
    setHorizon(2);
  };

  const overflowByWard = useMemo(() => {
    const map = {};
    (overflowRes?.wards || []).forEach((w) => {
      map[w.ward_id] = w;
    });
    return map;
  }, [overflowRes]);

  const visibleWards = useMemo(() => {
    return (allocationRes?.wards || []).filter((w) => {
      if (selectedCity !== "ALL" && w.city !== selectedCity) return false;
      if (selectedWard !== "ALL" && w.ward_id !== selectedWard) return false;
      return true;
    });
  }, [allocationRes, selectedCity, selectedWard]);

  const visibleCities = useMemo(() => {
    return (overflowRes?.cities || []).filter(
      (c) => selectedCity === "ALL" || c.city === selectedCity
    );
  }, [overflowRes, selectedCity]);

  const visibleTransfers = useMemo(() => {
    return (overflowRes?.transfers || []).filter(
      (t) => selectedCity === "ALL" || t.city === selectedCity
    );
  }, [overflowRes, selectedCity]);

  const visibleSimWards = useMemo(() => {
    return (simRes?.wards || []).filter((w) => {
      if (selectedCity !== "ALL" && w.city !== selectedCity) return false;
      if (selectedWard !== "ALL" && w.ward_id !== selectedWard) return false;
      return true;
    });
  }, [simRes, selectedCity, selectedWard]);

  const updateCrewCount = (wardId, delta) => {
    setDeployedCrews((prev) => {
      const current = prev[wardId] || 0;
      const next = Math.max(0, Math.min(10, current + delta));
      const updated = { ...prev, [wardId]: next };
      if (next === 0) delete updated[wardId];
      return updated;
    });
  };

  const handleOpenDispatch = async (wardId) => {
    const res = await fetchDispatchNotices({
      horizon,
      stock: stockPercentage,
      crews: totalCrews,
      date: selectedDate,
      ward: wardId,
    });
    const notice = res.notices?.[0] || null;
    setDispatchData(notice);
    setCopiedText(false);
  };

  const handleCopyNotice = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const totalCases = visibleWards.reduce(
    (s, w) => s + Number(w.predicted_cases || 0),
    0
  );
  const totalSalineAlloc = visibleWards.reduce(
    (s, w) => s + (w.allocated?.saline_bags_needed || 0),
    0
  );
  const totalSalineReq = visibleWards.reduce(
    (s, w) => s + (w.required?.saline_bags_needed || 0),
    0
  );
  const supplyDeficitCount = visibleWards.filter((w) => w.deficit_alert).length;
  const crewDeficitCount = visibleWards.filter((w) => (w.crew_deficit || 0) > 0).length;
  const deficitWardCount = visibleWards.filter(
    (w) => w.deficit_alert || (w.crew_deficit || 0) > 0
  ).length;
  const totalRoutedPatients = visibleTransfers.reduce(
    (s, t) => s + (t.patients || 0),
    0
  );

  return (
    <>
      <div id="dashboard-shell">
        <Navbar>
          <div className="flex flex-col lg:flex-row rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm text-slate-900">
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

            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
  {/* Dark Cyber-Glass Command Header */}
  <div className="relative overflow-hidden rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-white/15 p-5 sm:p-6 text-white shadow-[0_20px_50px_-15px_rgba(15,23,42,0.7)]">
    <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-rose-600/20 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />

    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest bg-rose-500/15 text-rose-300 border border-rose-400/30 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
          Resource Optimization &amp; Surge Routing Engine
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          Urban Dengue Outbreak &amp;{" "}
          <span className="bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
            Resource Dispatch System
          </span>
        </h2>
        <p className="text-xs text-slate-300 mt-1">
          2-to-4-Week Random Forest Forecast, Scarcity Optimization &amp; Intra-City Surge Routing
        </p>
      </div>

      {/* Modern Dark Control Pills */}
      <div className="flex flex-wrap items-center gap-2.5">
        <select
          aria-label="Forecast Horizon"
          value={horizon}
          onChange={(e) => setHorizon(Number(e.target.value))}
          className="px-3.5 py-2 text-xs font-bold rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white backdrop-blur-md focus:outline-none focus:border-rose-400 cursor-pointer transition"
        >
          <option value={2} className="bg-slate-900 text-white">+2 Weeks Horizon</option>
          <option value={3} className="bg-slate-900 text-white">+3 Weeks Horizon</option>
          <option value={4} className="bg-slate-900 text-white">+4 Weeks Horizon</option>
        </select>

        <select
          aria-label="Forecast Date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3.5 py-2 font-mono text-xs font-bold rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white backdrop-blur-md focus:outline-none focus:border-rose-400 cursor-pointer transition"
        >
          {availableDates.slice(-24).map((d) => (
            <option key={d} value={d} className="bg-slate-900 text-white">
              Date: {d}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>

  {/* Critical Warnings Alert Banner */}
  {(allocationRes?.summary?.warnings || []).length > 0 && (
    <div className="p-4 rounded-2xl bg-red-950/90 backdrop-blur-md border border-red-500/40 text-xs font-bold text-red-200 shadow-lg space-y-1.5">
      {allocationRes.summary.warnings.map((w, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping shrink-0" />
          <span>{w}</span>
        </div>
      ))}
    </div>
  )}

  {/* 4 Modern Telemetry KPI Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <div className="group relative overflow-hidden bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-amber-400" />
      <p className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        Projected Cases (+{horizon}W)
      </p>
      <p className="text-3xl font-black text-slate-900 mt-1.5 tracking-tight">
        {totalCases.toFixed(1)}
      </p>
      <p className="text-xs font-semibold text-rose-600 mt-1.5">
        Across {visibleWards.length} active wards
      </p>
    </div>

    <div className="group relative overflow-hidden bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
      <div className="flex justify-between items-start">
        <p className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Saline Allocation
        </p>
        <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
          <Droplets className="w-4 h-4" />
        </span>
      </div>
      <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
        {totalSalineAlloc.toLocaleString()}{" "}
        <span className="text-sm font-semibold text-slate-400">
          / {totalSalineReq.toLocaleString()}
        </span>
      </p>
      <p className="text-xs font-semibold text-blue-600 mt-1.5">
        Regional stock at {stockPercentage}%
      </p>
    </div>

    <div className="group relative overflow-hidden bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 to-rose-500" />
      <div className="flex justify-between items-start">
        <p className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Critical Deficit Wards
        </p>
        <span className="p-1.5 rounded-lg bg-red-50 text-red-600">
          <AlertTriangle className="w-4 h-4" />
        </span>
      </div>
      <p className="text-3xl font-black text-red-600 mt-1 tracking-tight">
        {deficitWardCount}
      </p>
      <p className="text-xs font-medium text-slate-600 mt-1.5">
        {supplyDeficitCount} supply deficit • {crewDeficitCount} crew short
      </p>
    </div>

    <div className="group relative overflow-hidden bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
      <div className="flex justify-between items-start">
        <p className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Overflow Transfers
        </p>
        <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
          <ArrowRightLeft className="w-4 h-4" />
        </span>
      </div>
      <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
        {totalRoutedPatients}{" "}
        <span className="text-base font-bold text-slate-600">Patients</span>
      </p>
      <p className="text-xs font-medium text-slate-600 mt-1.5">
        Intra-city bed balancing
      </p>
    </div>
  </div>

  {/* Modern Segmented Pill Navigation Tabs */}
  <div className="inline-flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/15 shadow-md">
    <button
      onClick={() => setActiveTab("allocation")}
      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
        activeTab === "allocation"
          ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30"
          : "text-slate-300 hover:text-white hover:bg-white/10"
      }`}
    >
      1. Constrained Resource Allocation ({visibleWards.length})
    </button>
    <button
      onClick={() => setActiveTab("overflow")}
      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
        activeTab === "overflow"
          ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30"
          : "text-slate-300 hover:text-white hover:bg-white/10"
      }`}
    >
      2. Hospital Surge &amp; Overflow Routing ({visibleTransfers.length})
    </button>
    <button
      onClick={() => setActiveTab("simulator")}
      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
        activeTab === "simulator"
          ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30"
          : "text-slate-300 hover:text-white hover:bg-white/10"
      }`}
    >
      3. &ldquo;What-If&rdquo; Vector Control Simulator
    </button>
  </div>

  {/* Tab 1: Allocation Table */}
  {activeTab === "allocation" && (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 bg-slate-950 text-white flex flex-wrap justify-between items-center gap-2">
        <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
          Priority-Ranked Ward Supply &amp; Crew Allocation
        </h3>
        <span className="font-mono text-[11px] text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
          Rates: 2.38 Saline • 1.16 Kits • 0.29 Beds / Case | Priority: Risk → Density → Cases
        </span>
      </div>
      <div className="overflow-x-auto">
  <table className="w-full text-left text-sm">
    <thead className="bg-slate-900 text-slate-200 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
      <tr>
        <th className="py-3 px-3.5">Rank &amp; Ward</th>
        <th className="py-3 px-3.5">Risk &amp; Cases</th>
        <th className="py-3 px-3.5">Saline (Alloc/Req)</th>
        <th className="py-3 px-3.5">Test Kits (Alloc/Req)</th>
        <th className="py-3 px-3.5">Beds (Req/Cap)</th>
        <th className="py-3 px-3.5">Crews</th>
        <th className="py-3 px-3.5">Status / Dispatch</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-200/80 bg-white">
      {visibleWards.map((w) => {
        const ow = overflowByWard[w.ward_id];
        const bedCap = ow?.bed_capacity ?? 1;
        const bedReq = w.required?.hospital_beds_required ?? 0;
        return (
          <tr
            key={w.ward_id}
            className="hover:bg-rose-50/40 transition-colors duration-150"
          >
            {/* Rank & Ward */}
            <td className="py-3 px-3.5">
              <div className="font-extrabold text-slate-900 tracking-tight">
                <span className="font-mono text-xs font-bold text-rose-600 mr-1.5">
                  #{w.rank}
                </span>
                {w.ward_id}
              </div>
              <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                {w.city} • {Number(w.population_density_sqkm).toLocaleString()}/km²
              </div>
            </td>

            {/* Risk & Cases */}
            <td className="py-3 px-3.5">
              <span
                className={`inline-flex items-center px-2.5 py-1 font-mono text-xs font-extrabold rounded-full border ${
                  w.risk_level === "Critical"
                    ? "bg-red-50 text-red-700 border-red-300"
                    : w.risk_level === "High"
                      ? "bg-orange-50 text-orange-700 border-orange-300"
                      : w.risk_level === "Medium"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-emerald-50 text-emerald-700 border-emerald-300"
                }`}
              >
                {w.risk_level} ({w.predicted_cases})
              </span>
            </td>

            {/* Saline */}
            <td className="py-3 px-3.5 font-mono text-xs whitespace-nowrap">
              <span
                className={
                  w.deficit?.saline_bags_needed > 0
                    ? "text-red-600 font-extrabold"
                    : "text-blue-700 font-extrabold"
                }
              >
                {w.allocated?.saline_bags_needed}
              </span>{" "}
              <span className="text-slate-400 font-medium">
                / {w.required?.saline_bags_needed}
              </span>
            </td>

            {/* Test Kits */}
            <td className="py-3 px-3.5 font-mono text-xs whitespace-nowrap">
              <span
                className={
                  w.deficit?.diagnostic_kits_needed > 0
                    ? "text-red-600 font-extrabold"
                    : "text-indigo-700 font-extrabold"
                }
              >
                {w.allocated?.diagnostic_kits_needed}
              </span>{" "}
              <span className="text-slate-400 font-medium">
                / {w.required?.diagnostic_kits_needed}
              </span>
            </td>

            {/* Beds */}
            <td className="py-3 px-3.5 font-mono text-xs whitespace-nowrap">
              <span
                className={
                  bedReq > bedCap
                    ? "text-amber-600 font-extrabold"
                    : "text-teal-700 font-extrabold"
                }
              >
                {bedReq}
              </span>{" "}
              <span className="text-slate-400 font-medium">/ {bedCap}</span>
            </td>

            {/* Crews */}
            <td className="py-3 px-3.5 whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg">
                <SprayCan className="w-3.5 h-3.5 text-rose-600" />
                {w.crews_assigned}/{w.crews_needed}
              </span>
            </td>

            {/* Status & Dispatch (Fully visible side-by-side) */}
            <td className="py-3 px-3.5 whitespace-nowrap">
              <div className="flex items-center gap-2">
                {w.deficit_alert ? (
                  <span className="px-2.5 py-1 font-mono text-[11px] font-extrabold bg-red-600 text-white rounded-lg shadow-2xs">
                    DEFICIT ({w.fulfilment_pct}%)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 font-mono text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg">
                    FULFILLED
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenDispatch(w.ward_id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-gradient-to-r hover:from-red-600 hover:to-rose-600 text-white rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  <Send className="w-3 h-3 text-rose-400" /> Dispatch
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
    </div>
  )}

  {/* Tab 2: Hospital Surge & Overflow */}
  {activeTab === "overflow" && (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCities.map((c) => (
          <div
            key={c.city}
            className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-extrabold text-slate-900">{c.city}</h3>
              <span
                className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  c.utilization_pct > 100
                    ? "bg-red-100 text-red-700 border-red-200"
                    : c.utilization_pct > 85
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-emerald-100 text-emerald-700 border-emerald-200"
                }`}
              >
                {c.utilization_pct}% Utilized
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2.5">
              <div
                className={`h-full rounded-full transition-all ${
                  c.utilization_pct > 100
                    ? "bg-gradient-to-r from-red-600 to-rose-500"
                    : "bg-gradient-to-r from-rose-500 to-amber-400"
                }`}
                style={{ width: `${Math.min(100, c.utilization_pct)}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[11px] text-slate-500">
              <span>
                Demand: {c.total_demand} / {c.total_capacity} beds
              </span>
              <span className="font-semibold text-slate-700">
                Headroom: {c.headroom_after} free
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-extrabold text-slate-900 mb-3.5 flex items-center gap-2">
          <BedDouble className="w-5 h-5 text-rose-600" />
          Automated Intra-City Overflow Patient Transfers
        </h3>
        {visibleTransfers.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200">
            No cross-ward hospital overflow detected for this horizon/date. Try +3 Weeks or 2025-08-25.
          </p>
        ) : (
          <div className="space-y-2.5">
            {visibleTransfers.map((r, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50/90 text-sm text-slate-800"
              >
                <div className="flex items-center gap-2.5 font-medium">
                  <span className="font-mono text-[11px] font-bold uppercase px-2.5 py-0.5 bg-slate-900 text-white rounded-md">
                    {r.city}
                  </span>
                  <span className="font-bold text-rose-700">{r.from_ward}</span>
                  <span className="text-slate-400">➔</span>
                  <span className="font-bold text-emerald-700">{r.to_ward}</span>
                </div>
                <div className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                  {r.patients} Patient(s) Routed Intra-City
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )}

  {/* Tab 3: What-If Vector Control Simulator */}
  {activeTab === "simulator" && (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-400" />
            Model-Driven 2-to-4-Week Vector Control Impact Simulator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {simRes?.preview_mode
              ? "Showing 2-crew benchmark across all wards — click +/- on any ward to simulate custom deployment"
              : "Simulating your custom crew deployment through Random Forest 2W → 3W → 4W models"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!simRes?.preview_mode && (
            <button
              onClick={() => setDeployedCrews({})}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer transition"
            >
              Reset Benchmark
            </button>
          )}
          <div className="font-mono text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 px-3 py-1.5 rounded-xl">
            Cases Prevented: {simRes?.summary?.total_cases_prevented ?? 0} | Beds Saved:{" "}
            {simRes?.summary?.total_beds_saved ?? 0} | Saline Saved:{" "}
            {simRes?.summary?.total_saline_saved ?? 0}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[740px]">
          <thead className="bg-slate-100/90 text-slate-600 font-mono text-[11px] uppercase border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">ROI Rank &amp; Ward</th>
              <th className="py-3.5 px-4">Deploy Crews</th>
              <th className="py-3.5 px-4">Baseline ➔ Simulated (2–4W)</th>
              <th className="py-3.5 px-4">Beds Saved</th>
              <th className="py-3.5 px-4">Saline Saved</th>
              <th className="py-3.5 px-4">ROI (Cases / Crew)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleSimWards.map((w) => {
              const activeCrews = simRes?.preview_mode
                ? w.crews_deployed
                : deployedCrews[w.ward_id] || 0;
              return (
                <tr key={w.ward_id} className="hover:bg-slate-50/90 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-xs font-bold text-slate-400 mr-2">#{w.roi_rank}</span>
                    <span className="font-bold text-slate-900">{w.ward_id}</span>
                    <span className="block text-xs text-slate-500 ml-6">
                      {w.city} • {Number(w.population_density_sqkm).toLocaleString()}/km²
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-xl p-1 shadow-2xs">
                      <button
                        onClick={() => updateCrewCount(w.ward_id, -1)}
                        className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer transition"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs">
                        {activeCrews}
                      </span>
                      <button
                        onClick={() => updateCrewCount(w.ward_id, 1)}
                        className="w-6 h-6 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs">
                    <span className="text-slate-400 line-through mr-1.5">
                      {w.baseline_cases?.total}
                    </span>
                    ➔{" "}
                    <span className="font-bold text-emerald-700">
                      {w.simulated_cases?.total}
                    </span>{" "}
                    {w.cases_prevented > 0 && (
                      <span className="text-emerald-600 font-bold">
                        (-{w.cases_prevented})
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-700">
                    -{w.beds_saved} beds
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-700">
                    -{w.saline_saved} bags
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 font-mono text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {w.roi_cases_per_crew} cases/crew
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )}
</div>
          </div>
        </Navbar>
      </div>

      {dispatchData && (
        <div
          id="dispatch-modal-backdrop"
          onClick={() => setDispatchData(null)}
          onKeyDown={(e) => e.key === "Escape" && setDispatchData(null)}
          tabIndex={-1}
          className="fixed inset-0 bg-black/60 flex items-start justify-center p-4 sm:py-8 z-50 overflow-y-auto"
        >
          <div
            id="dispatch-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-auto"
          >
            {/* 1-PAGE PRINTABLE WARD COMMISSIONER OPERATIONAL REPORT */}
            <div
              id="printable-brief"
              className="space-y-4 border border-slate-200 rounded-xl p-5 bg-white text-slate-900"
            >
              <div className="flex justify-between items-start gap-3 border-b-2 border-slate-900 pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                    DGHS &amp; Municipal Dengue Command Center • Ward Operational Summary
                  </p>
                  <h3 className="font-extrabold text-xl text-slate-900 mt-0.5">
                    {dispatchData.brief?.title || `Ward Commissioner Brief — ${dispatchData.ward_id}`}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    City Corporation: <strong>{dispatchData.city}</strong> • Ward ID:{" "}
                    <strong>{dispatchData.ward_id}</strong> • Observation Date:{" "}
                    <strong>{dispatchData.brief?.data_date || selectedDate}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchData(null)}
                  className="no-print shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-700 text-xs font-bold cursor-pointer"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>

              <div
                className={`p-3 rounded-lg border text-xs font-bold flex flex-wrap items-center justify-between gap-2 ${dispatchData.deficit_alert
                    ? "bg-red-50 border-red-300 text-red-800"
                    : "bg-emerald-50 border-emerald-300 text-emerald-800"
                  }`}
              >
                <span>
                  Priority Rank #{dispatchData.rank} • {dispatchData.risk_level} Risk (+
                  {dispatchData.horizon_weeks} Weeks Horizon)
                </span>
                <span>{dispatchData.brief?.alert_message || "STOCK ADEQUATE (100% Fulfilled)"}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-slate-500">Current Weekly Cases</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {dispatchData.brief?.current_cases ?? 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-slate-500">Projected (+{dispatchData.horizon_weeks}W)</p>
                  <p className="text-lg font-extrabold text-red-700 mt-0.5">
                    {dispatchData.predicted_cases} cases
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-slate-500">Population Density</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {Number(dispatchData.brief?.population_density_sqkm || 0).toLocaleString()}/km²
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-slate-500">Supply Fulfilment</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {dispatchData.brief?.fulfilment_pct ?? 100}% (Stock @ {stockPercentage}%)
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  1. Medical Supply &amp; Vector Control Allocation Summary
                </h4>
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 uppercase">
                    <tr>
                      <th className="py-2 px-3 border-b border-slate-200">Resource Category</th>
                      <th className="py-2 px-3 border-b border-slate-200">Required</th>
                      <th className="py-2 px-3 border-b border-slate-200">Allocated</th>
                      <th className="py-2 px-3 border-b border-slate-200">Unmet Deficit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 px-3 font-semibold">IV Saline Bags (2.38 / case)</td>
                      <td className="py-2 px-3">
                        {dispatchData.brief?.supplies?.saline_bags?.required ?? 0}
                      </td>
                      <td className="py-2 px-3 font-bold">
                        {dispatchData.brief?.supplies?.saline_bags?.allocated ?? 0}
                      </td>
                      <td className="py-2 px-3 font-bold text-red-600">
                        {dispatchData.brief?.supplies?.saline_bags?.deficit ?? 0}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">NS1 Diagnostic Kits (1.16 / case)</td>
                      <td className="py-2 px-3">
                        {dispatchData.brief?.supplies?.diagnostic_kits?.required ?? 0}
                      </td>
                      <td className="py-2 px-3 font-bold">
                        {dispatchData.brief?.supplies?.diagnostic_kits?.allocated ?? 0}
                      </td>
                      <td className="py-2 px-3 font-bold text-red-600">
                        {dispatchData.brief?.supplies?.diagnostic_kits?.deficit ?? 0}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">Larvicide &amp; Fogging Crews</td>
                      <td className="py-2 px-3">
                        {dispatchData.brief?.vector_control?.crews_needed ?? 0} teams
                      </td>
                      <td className="py-2 px-3 font-bold">
                        {dispatchData.brief?.vector_control?.crews_assigned ?? 0} teams
                      </td>
                      <td className="py-2 px-3 font-bold text-red-600">
                        {dispatchData.brief?.vector_control?.crew_deficit ?? 0} teams
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <h4 className="font-bold uppercase tracking-wider text-slate-800">
                  2. Hospital Bed Capacity &amp; Intra-City Surge Routing
                </h4>
                <p className="text-slate-700">
                  <strong>Ward Bed Demand vs. Local Capacity:</strong>{" "}
                  {dispatchData.brief?.hospital_surge?.beds_required ?? 0} beds required /{" "}
                  {dispatchData.brief?.hospital_surge?.local_bed_capacity ?? 0} local beds available
                  {(dispatchData.brief?.hospital_surge?.net_deficit ?? 0) > 0
                    ? ` (Net Overflow: ${dispatchData.brief.hospital_surge.net_deficit} patients)`
                    : ""}
                </p>
                <p className="text-slate-700">
                  <strong>Routing Directive:</strong>{" "}
                  {dispatchData.brief?.hospital_surge?.routing_instruction ||
                    dispatchData.routing_instruction}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                <span>Model: Random Forest (200 Trees, 23 Lagged Features)</span>
                <span>Generated Offline-Ready • DGHS Decision Support</span>
              </div>
            </div>

            {/* Screen-Only SMS / WhatsApp Preview */}
            <div className="no-print space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Field Dispatch Preview ({dispatchChannel.toUpperCase()})
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDispatchChannel("whatsapp")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer ${dispatchChannel === "whatsapp"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700"
                      }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchChannel("sms")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer ${dispatchChannel === "sms"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700"
                      }`}
                  >
                    SMS
                  </button>
                </div>
              </div>
              <pre className="bg-slate-900 text-emerald-300 p-3.5 rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {dispatchChannel === "whatsapp" ? dispatchData.whatsapp : dispatchData.sms}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="no-print flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleCopyNotice(
                    dispatchChannel === "whatsapp" ? dispatchData.whatsapp : dispatchData.sms
                  )
                }
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                {copiedText ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedText ? "Copied!" : `Copy ${dispatchChannel.toUpperCase()} Notice`}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print / Save 1-Page PDF
              </button>
              <button
                type="button"
                onClick={() => setDispatchData(null)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}