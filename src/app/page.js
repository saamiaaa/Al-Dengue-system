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

  const [stockPercentage, setStockPercentage] = useState(100);
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
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const [alloc, over] = await Promise.all([
        fetchAllocation({ horizon, stock: stockPercentage, crews: totalCrews, date: selectedDate }),
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
      const sim = await fetchVectorSimulation({ date: selectedDate, deployed_crews: deployedCrews });
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
    (overflowRes?.wards || []).forEach((w) => { map[w.ward_id] = w; });
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

  const totalCases = visibleWards.reduce((s, w) => s + Number(w.predicted_cases || 0), 0);
  const totalSalineAlloc = visibleWards.reduce((s, w) => s + (w.allocated?.saline_bags_needed || 0), 0);
  const totalSalineReq = visibleWards.reduce((s, w) => s + (w.required?.saline_bags_needed || 0), 0);
  const deficitWardCount = visibleWards.filter((w) => w.deficit_alert).length;
  const totalRoutedPatients = visibleTransfers.reduce((s, t) => s + (t.patients || 0), 0);

  return (
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

        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Urban Dengue Outbreak &amp; Resource Dispatch System
              </h2>
              <p className="text-xs text-slate-500">
                2-to-4-Week Random Forest Forecast, Scarcity Optimization &amp; Intra-City Surge Routing
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Forecast Horizon"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 cursor-pointer"
              >
                <option value={2}>+2 Weeks Horizon</option>
                <option value={3}>+3 Weeks Horizon</option>
                <option value={4}>+4 Weeks Horizon</option>
              </select>

              <select
                aria-label="Forecast Date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 cursor-pointer"
              >
                {availableDates.slice(-24).map((d) => (
                  <option key={d} value={d}>
                    Date: {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(allocationRes?.summary?.warnings || []).length > 0 && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-300 text-xs font-bold text-red-800 space-y-1">
              {allocationRes.summary.warnings.map((w, idx) => (
                <div key={idx}>🚨 {w}</div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase">Projected Cases (+{horizon}W)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalCases.toFixed(1)}</p>
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
              <p className="text-xs text-slate-500 mt-1">Regional stock at {stockPercentage}%</p>
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
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalRoutedPatients} Patients</p>
              <p className="text-xs text-slate-500 mt-1">Intra-city bed balancing</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-6">
            <button
              onClick={() => setActiveTab("allocation")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "allocation"
                  ? "border-rose-600 text-rose-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              1. Constrained Resource Allocation ({visibleWards.length})
            </button>
            <button
              onClick={() => setActiveTab("overflow")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "overflow"
                  ? "border-rose-600 text-rose-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              2. Hospital Surge &amp; Overflow Routing ({visibleTransfers.length})
            </button>
            <button
              onClick={() => setActiveTab("simulator")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "simulator"
                  ? "border-rose-600 text-rose-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              3. &ldquo;What-If&rdquo; Vector Control Simulator
            </button>
          </div>

          {activeTab === "allocation" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
                <h3 className="font-bold text-slate-800">
                  Priority-Ranked Ward Supply &amp; Crew Allocation
                </h3>
                <span className="text-xs text-slate-500">
                  Rates: 2.38 Saline • 1.16 Kits • 0.29 Beds / Case | Priority: Risk → Density → Cases
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Rank &amp; Ward</th>
                      <th className="py-3 px-4">Risk &amp; Cases</th>
                      <th className="py-3 px-4">Saline (Alloc/Req)</th>
                      <th className="py-3 px-4">Test Kits (Alloc/Req)</th>
                      <th className="py-3 px-4">Beds (Req/Cap)</th>
                      <th className="py-3 px-4">Crews</th>
                      <th className="py-3 px-4">Status / Dispatch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleWards.map((w) => {
                      const ow = overflowByWard[w.ward_id];
                      const bedCap = ow?.bed_capacity ?? 1;
                      const bedReq = w.required?.hospital_beds_required ?? 0;
                      return (
                        <tr key={w.ward_id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">
                              <span className="text-slate-400 mr-1.5">#{w.rank}</span>
                              {w.ward_id}
                            </div>
                            <div className="text-xs text-slate-500">
                              {w.city} • {Number(w.population_density_sqkm).toLocaleString()}/km²
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${
                                w.risk_level === "Critical"
                                  ? "bg-red-100 text-red-700"
                                  : w.risk_level === "High"
                                  ? "bg-orange-100 text-orange-700"
                                  : w.risk_level === "Medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {w.risk_level} ({w.predicted_cases})
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            <span className={w.deficit?.saline_bags_needed > 0 ? "text-red-600 font-bold" : "text-slate-800"}>
                              {w.allocated?.saline_bags_needed}
                            </span>{" "}
                            / {w.required?.saline_bags_needed}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            <span className={w.deficit?.diagnostic_kits_needed > 0 ? "text-red-600 font-bold" : "text-slate-800"}>
                              {w.allocated?.diagnostic_kits_needed}
                            </span>{" "}
                            / {w.required?.diagnostic_kits_needed}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            <span className={bedReq > bedCap ? "text-amber-600 font-bold" : "text-slate-800"}>
                              {bedReq}
                            </span>{" "}
                            / {bedCap}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 px-2 py-1 rounded">
                              <SprayCan className="w-3 h-3 text-rose-600" /> {w.crews_assigned}/{w.crews_needed}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {w.deficit_alert ? (
                                <span className="px-2 py-0.5 text-[11px] font-bold bg-red-600 text-white rounded">
                                  DEFICIT ({w.fulfilment_pct}%)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 rounded">
                                  FULFILLED
                                </span>
                              )}
                              <button
                                onClick={() => handleOpenDispatch(w.ward_id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-md cursor-pointer"
                              >
                                <Send className="w-3 h-3" /> Dispatch
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

          {activeTab === "overflow" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleCities.map((c) => (
                  <div key={c.city} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-slate-800">{c.city}</h3>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          c.utilization_pct > 100
                            ? "bg-red-100 text-red-700"
                            : c.utilization_pct > 85
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {c.utilization_pct}% Utilized
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full ${c.utilization_pct > 100 ? "bg-red-600" : "bg-rose-500"}`}
                        style={{ width: `${Math.min(100, c.utilization_pct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Demand: {c.total_demand} / {c.total_capacity} beds</span>
                      <span>Headroom: {c.headroom_after} free</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-rose-600" />
                  Automated Intra-City Overflow Patient Transfers
                </h3>
                {visibleTransfers.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No cross-ward hospital overflow detected for this horizon/date. Try +3 Weeks or 2025-08-25.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {visibleTransfers.map((r, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800"
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <span className="text-xs font-bold uppercase px-2 py-0.5 bg-white border rounded">
                            {r.city}
                          </span>
                          <span className="font-bold text-rose-700">{r.from_ward}</span>
                          <span>➔</span>
                          <span className="font-bold text-emerald-700">{r.to_ward}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-700">
                          {r.patients} Patient(s) Routed Intra-City
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "simulator" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-emerald-600" />
                    Model-Driven 2-to-4-Week Vector Control Impact Simulator
                  </h3>
                  <p className="text-xs text-slate-500">
                    {simRes?.preview_mode
                      ? "Showing 2-crew benchmark across all wards — click +/- on any ward to simulate custom deployment"
                      : "Simulating your custom crew deployment through Random Forest 2W → 3W → 4W models"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!simRes?.preview_mode && (
                    <button
                      onClick={() => setDeployedCrews({})}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      Reset Benchmark
                    </button>
                  )}
                  <div className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg">
                    Cases Prevented: {simRes?.summary?.total_cases_prevented ?? 0} | Beds Saved: {simRes?.summary?.total_beds_saved ?? 0} | Saline Saved: {simRes?.summary?.total_saline_saved ?? 0}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">ROI Rank &amp; Ward</th>
                      <th className="py-3 px-4">Deploy Crews</th>
                      <th className="py-3 px-4">Baseline ➔ Simulated (2–4W)</th>
                      <th className="py-3 px-4">Beds Saved</th>
                      <th className="py-3 px-4">Saline Saved</th>
                      <th className="py-3 px-4">ROI (Cases / Crew)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleSimWards.map((w) => {
                      const activeCrews = simRes?.preview_mode ? w.crews_deployed : (deployedCrews[w.ward_id] || 0);
                      return (
                        <tr key={w.ward_id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-400 mr-2">#{w.roi_rank}</span>
                            <span className="font-semibold text-slate-900">{w.ward_id}</span>
                            <span className="block text-xs text-slate-500 ml-6">
                              {w.city} • {Number(w.population_density_sqkm).toLocaleString()}/km²
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                              <button
                                onClick={() => updateCrewCount(w.ward_id, -1)}
                                className="w-6 h-6 rounded bg-white shadow text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-bold text-xs">{activeCrews}</span>
                              <button
                                onClick={() => updateCrewCount(w.ward_id, 1)}
                                className="w-6 h-6 rounded bg-white shadow text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            <span className="text-slate-500 line-through mr-1">{w.baseline_cases?.total}</span>
                            ➔ <span className="font-bold text-emerald-700">{w.simulated_cases?.total}</span>{" "}
                            {w.cases_prevented > 0 && (
                              <span className="text-emerald-600 font-semibold">(-{w.cases_prevented})</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-700">-{w.beds_saved} beds</td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-700">-{w.saline_saved} bags</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-800">
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

        {dispatchData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    Commissioner Dispatch Notice — {dispatchData.ward_id}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {dispatchData.city} • Rank #{dispatchData.rank} • {dispatchData.risk_level} Risk
                  </p>
                </div>
                <button
                  onClick={() => setDispatchData(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setDispatchChannel("whatsapp")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                    dispatchChannel === "whatsapp" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  WhatsApp Brief
                </button>
                <button
                  onClick={() => setDispatchChannel("sms")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                    dispatchChannel === "sms" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  SMS Gateway Alert
                </button>
              </div>

              <pre className="bg-slate-900 text-emerald-300 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {dispatchChannel === "whatsapp" ? dispatchData.whatsapp : dispatchData.sms}
              </pre>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() =>
                    handleCopyNotice(dispatchChannel === "whatsapp" ? dispatchData.whatsapp : dispatchData.sms)
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg cursor-pointer"
                >
                  {copiedText ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedText ? "Copied!" : `Copy ${dispatchChannel.toUpperCase()} Notice`}
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Navbar>
  );
}