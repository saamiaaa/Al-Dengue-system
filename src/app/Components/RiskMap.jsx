
"use client";

import React, { useState, useEffect } from "react";
import {
  fetchWardsData,
  fetchWardPrediction,
  fetchOverflow,
} from "../../lib/api";

const TIER_CONFIG = {
  Critical: {
    score: 88,
    tile: "bg-red-600 text-white border-red-700 hover:bg-red-700",
    badge: "bg-red-100 text-red-700 border-red-300",
  },
  High: {
    score: 74,
    tile: "bg-amber-500 text-white border-amber-600 hover:bg-amber-600",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
  },
  Medium: {
    score: 55,
    tile: "bg-yellow-200 text-gray-900 border-yellow-400 hover:bg-yellow-300",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  Low: {
    score: 32,
    tile: "bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-300",
  },
};

const getTier = (raw = "") => {
  const s = String(raw).toLowerCase();

  return s.includes("crit")
    ? "Critical"
    : s.includes("high")
    ? "High"
    : s.includes("med")
    ? "Medium"
    : "Low";
};

// Generate ward-specific recommendations from actual ward data
const buildWardActionBrief = (ward, allWards) => {
  if (!ward) return null;

  const average = (key) => {
    if (!allWards.length) return 0;

    return (
      allWards.reduce(
        (sum, item) => sum + Number(item[key] || 0),
        0
      ) / allWards.length
    );
  };

  const averages = {
    rain: average("rain"),
    logging: average("logging"),
    sanitation: average("sanitation"),
    cases: average("cases"),
  };

  const signals = [];
  const actions = [];

  // Rainfall comparison
  if (Number(ward.rain) > averages.rain) {
    signals.push("Above-average rainfall");

    actions.push(
      "Inspect low-lying areas and remove stagnant water after rainfall."
    );
  }

  // Waterlogging comparison
  if (Number(ward.logging) > averages.logging) {
    signals.push("Higher waterlogging risk");

    actions.push(
      "Prioritize blocked-drain inspections and stagnant-water removal."
    );
  }

  // Sanitation comparison
  if (Number(ward.sanitation) < averages.sanitation) {
    signals.push("Below-average sanitation score");

    actions.push(
      "Arrange sanitation inspections and clean areas with unmanaged waste."
    );
  }

  // Predicted cases comparison
  if (Number(ward.cases) > averages.cases) {
    signals.push("Above-average predicted cases");

    actions.push(
      "Strengthen local dengue surveillance and prepare healthcare response teams."
    );
  }

  // Risk-tier recommendations
  if (ward.tier === "Critical" || ward.tier === "High") {
    actions.unshift(
      "Give this ward priority for municipal inspection and vector-control planning."
    );
  } else if (ward.tier === "Medium") {
    actions.unshift(
      "Increase routine monitoring and address emerging risk indicators."
    );
  }

  if (actions.length === 0) {
    actions.push(
      "Continue routine mosquito-control activities and weekly ward surveillance."
    );
  }

  if (signals.length === 0) {
    signals.push(
      "No indicators above the city comparison thresholds."
    );
  }

  return { signals, actions };
};

const RiskMap = ({ selectedCity }) => {
  const [wards, setWards] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [filterTier, setFilterTier] = useState("All");
  const [loadedCity, setLoadedCity] = useState("");
  const [error, setError] = useState(false);

  // Overflow routing data
  const [overflowData, setOverflowData] = useState(null);
  const [overflowLoading, setOverflowLoading] = useState(true);
  const [overflowError, setOverflowError] = useState(false);

  // Existing risk map data
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await fetchWardsData();

        const list = (res.wards || []).filter(
          (w) => w.city === selectedCity
        );

        const results = await Promise.all(
          list.map((w) =>
            fetchWardPrediction(w.ward_id).catch(() => null)
          )
        );

        if (!active) return;

        setWards(
          list.map((w, i) => {
            const p = results[i];

            const f2 = p?.forecasts?.find(
              (f) => f.horizon_weeks === 2
            );

            const tier = getTier(f2?.risk_level);

            return {
              id: w.ward_id,
              tier,
              ...TIER_CONFIG[tier],

              rain: Number(
                p?.weather?.rainfall_prev_2w_sum ??
                p?.weather?.rainfall_mm ??
                0
              ).toFixed(1),

              logging: Number(
                w.water_logging_risk_index ?? 0.5
              ).toFixed(2),

              sanitation: Number(
                w.sanitation_score ?? 0.5
              ).toFixed(2),

              pop: Number(
                w.population_density_sqkm ?? 0
              ).toLocaleString(),

              cases: Math.round(
                Number(
                  f2?.predicted_cases ?? p?.current_cases ?? 0
                )
              ),
            };
          })
        );

        setError(false);
      } catch {
        if (active) {
          setWards([]);
          setError(true);
        }
      } finally {
        if (active) setLoadedCity(selectedCity);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedCity]);

  // Fetch existing backend overflow calculations
  useEffect(() => {
    let active = true;

    setOverflowLoading(true);
    setOverflowError(false);

    (async () => {
      try {
        const result = await fetchOverflow({ horizon: 2 });

        if (!active) return;

        if (!result?.success) {
          throw new Error("Unable to load overflow routing");
        }

        setOverflowData(result);
      } catch {
        if (active) {
          setOverflowData(null);
          setOverflowError(true);
        }
      } finally {
        if (active) setOverflowLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedCity]);

  const isLoading = !error && loadedCity !== selectedCity;

  const filtered =
    filterTier === "All"
      ? wards
      : wards.filter((w) => w.tier === filterTier);

  const activeWard =
    wards.find((w) => w.id === selectedId) || wards[0];

  // Generate the selected ward's action brief
  const actionBrief = buildWardActionBrief(activeWard, wards);

  // Filter overflow data for the selected city
  const cityTransfers = (overflowData?.transfers || []).filter(
    (transfer) => transfer.city === selectedCity
  );

  const cityOverflowWards = (overflowData?.wards || []).filter(
    (ward) => ward.city === selectedCity
  );

  const citySummary = (overflowData?.cities || []).find(
    (city) => city.city === selectedCity
  );

  const unmetWards = cityOverflowWards.filter(
    (ward) => Number(ward.net_deficit) > 0
  );

  const sendingWards = cityOverflowWards.filter(
    (ward) => Number(ward.overflow_out) > 0
  );

  const receivingWards = cityOverflowWards.filter(
    (ward) => Number(ward.received_in) > 0
  );

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString();

  return (
    <div className="space-y-6">

      {/* Existing Risk Map Header */}
      <div className="bg-white/95 p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
            Geospatial Ward Vulnerability Heatmap •{" "}
            {error ? "OFFLINE" : "LIVE ML"}
          </span>

          <h2 className="text-xl font-bold text-gray-800">
            {selectedCity} Ward Risk Map ({wards.length} Wards)
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {["All", "Critical", "High", "Medium", "Low"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              className={`px-3 py-1.5 rounded-lg border cursor-pointer ${
                filterTier === t
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Existing Ward Grid and Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <div className="lg:col-span-8 bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">

          <div className="flex justify-between text-xs text-gray-500 border-b pb-3">
            <span>
              Showing <strong>{filtered.length}</strong> of {wards.length} wards
            </span>

            <span>🔴 Critical • 🟠 High • 🟡 Medium • 🟢 Low</span>
          </div>

          {isLoading ? (
            <p className="py-12 text-center text-sm text-gray-500 animate-pulse">
              Loading live ward heatmap...
            </p>
          ) : filtered.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedId(w.id)}
                  className={`p-3.5 rounded-xl border-2 text-left transition hover:scale-105 cursor-pointer ${w.tile} ${
                    activeWard?.id === w.id
                      ? "ring-4 ring-slate-900/35 scale-105"
                      : ""
                  }`}
                >
                  <p className="text-xs font-bold truncate">
                    {w.id}
                  </p>

                  <p className="text-2xl font-extrabold mt-1">
                    {w.score}
                  </p>

                  <p className="text-[11px] opacity-90">
                    {w.tier} Risk
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-gray-500">
              No wards in {filterTier} tier.
            </p>
          )}
        </div>

        {/* Existing Ward Inspector */}
        <div className="lg:col-span-4 bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-5">

          {activeWard ? (
            <>
              <div className="space-y-3">

                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-lg font-extrabold text-gray-900">
                    📍 {activeWard.id}
                  </h3>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${activeWard.badge}`}
                  >
                    {activeWard.tier} ({activeWard.score}/100)
                  </span>
                </div>

                {[
                  [
                    "2-Wk Lagged Rainfall",
                    `${activeWard.rain} mm`,
                    "text-blue-600",
                  ],
                  [
                    "Water Logging Index",
                    `${activeWard.logging} / 1.0`,
                    "text-red-600",
                  ],
                  [
                    "Sanitation Score",
                    `${activeWard.sanitation} / 1.0`,
                    "text-gray-800",
                  ],
                  [
                    "Population Density",
                    `${activeWard.pop} / sq.km`,
                    "text-gray-800",
                  ],
                  [
                    "2-Wk Predicted Cases",
                    `${activeWard.cases} cases/wk`,
                    "text-amber-700",
                  ],
                ].map(([label, val, color]) => (
                  <div
                    key={label}
                    className="flex justify-between p-2.5 bg-gray-50 rounded-lg text-sm"
                  >
                    <span className="text-gray-600">
                      {label}:
                    </span>

                    <span className={`font-bold ${color}`}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>

              {/* NEW: Ward Action Brief */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50 space-y-4">

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-800">
                      Ward Action Brief
                    </p>

                    <p className="text-[11px] text-indigo-600 mt-1">
                      Data-based municipal recommendations
                    </p>
                  </div>

                  <span className="text-xl">📋</span>
                </div>

                {/* Identified Signals */}
                <div>
                  <p className="text-xs font-bold text-gray-800 mb-2">
                    Identified Risk Signals
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {actionBrief?.signals.map((signal, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 rounded-full bg-white border border-indigo-200 text-[10px] font-semibold text-indigo-700"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Actions */}
                <div>
                  <p className="text-xs font-bold text-gray-800 mb-2">
                    Recommended Actions
                  </p>

                  <div className="space-y-2">
                    {actionBrief?.actions.map((action, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-xs text-gray-700"
                      >
                        <span className="text-indigo-600 font-bold">
                          {index + 1}.
                        </span>

                        <p>{action}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-200">
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Recommendations are generated using comparisons
                    with available ward-level data in {selectedCity}.
                    These are decision-support suggestions, not
                    official public-health instructions.
                  </p>
                </div>

              </div>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-gray-500">
              Select a ward to inspect.
            </p>
          )}
        </div>
      </div>

      {/* Existing Hospital Overflow Route Visualization */}
      <section className="bg-white/95 rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Phase 2 • Hospital Capacity Management
            </span>

            <h2 className="text-xl font-extrabold text-gray-900 mt-1">
              Hospital Overflow Routes
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Automatic patient transfers between wards within the same city.
            </p>
          </div>

          <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold w-fit">
            +2 Week Forecast
          </span>
        </div>

        <div className="p-5 space-y-5">

          {overflowLoading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500 animate-pulse">
                Calculating hospital overflow routes...
              </p>
            </div>
          ) : overflowError || !overflowData ? (
            <div className="p-5 rounded-lg bg-red-50 border border-red-200 text-red-700">
              <p className="font-bold text-sm">
                Overflow routing unavailable
              </p>

              <p className="text-xs mt-1">
                Unable to load the hospital transfer information.
                Please check the backend connection.
              </p>
            </div>
          ) : (
            <>
              {/* City Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-gray-500">
                    Total Overflow
                  </p>

                  <p className="text-2xl font-extrabold text-gray-900 mt-1">
                    {formatNumber(citySummary?.overflow_patients)}
                  </p>

                  <p className="text-xs text-gray-500">
                    Patients requiring transfer
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-emerald-700">
                    Successfully Routed
                  </p>

                  <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                    {formatNumber(citySummary?.routed_patients)}
                  </p>

                  <p className="text-xs text-emerald-700">
                    Patients transferred
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-xs text-red-700">
                    Unmet Deficit
                  </p>

                  <p className="text-2xl font-extrabold text-red-700 mt-1">
                    {formatNumber(citySummary?.unmet_patients)}
                  </p>

                  <p className="text-xs text-red-700">
                    Patients without local capacity
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-700">
                    Receiving Wards
                  </p>

                  <p className="text-2xl font-extrabold text-blue-700 mt-1">
                    {receivingWards.length}
                  </p>

                  <p className="text-xs text-blue-700">
                    Wards accepting patients
                  </p>
                </div>
              </div>

              {/* Transfer Routes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">
                    Patient Transfer Network
                  </h3>

                  <span className="text-xs text-gray-500">
                    {cityTransfers.length} transfer routes
                  </span>
                </div>

                {cityTransfers.length > 0 ? (
                  <div className="space-y-3">
                    {cityTransfers.map((transfer, index) => {
                      const source = cityOverflowWards.find(
                        (w) => w.ward_id === transfer.from_ward
                      );

                      const destination = cityOverflowWards.find(
                        (w) => w.ward_id === transfer.to_ward
                      );

                      return (
                        <div
                          key={`${transfer.from_ward}-${transfer.to_ward}-${index}`}
                          className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50"
                        >
                          {/* Source Ward */}
                          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />

                              <span className="text-xs font-bold uppercase text-red-700">
                                Sending Ward
                              </span>
                            </div>

                            <p className="text-lg font-extrabold text-gray-900 mt-2">
                              {transfer.from_ward}
                            </p>

                            <p className="text-xs text-gray-600 mt-1">
                              Estimated demand:{" "}
                              {formatNumber(source?.bed_demand)} beds
                            </p>

                            <p className="text-xs text-red-700 font-semibold mt-1">
                              Overflow: {formatNumber(source?.overflow)} patients
                            </p>
                          </div>

                          {/* Route Connector */}
                          <div className="flex flex-col items-center justify-center gap-1 py-2">
                            <span className="text-xs font-bold text-indigo-700">
                              {formatNumber(transfer.patients)} patients
                            </span>

                            <span className="text-2xl text-indigo-600">
                              <span className="hidden md:inline">→</span>
                              <span className="md:hidden">↓</span>
                            </span>

                            <span className="text-[10px] text-gray-500 uppercase font-semibold">
                              Intra-city transfer
                            </span>
                          </div>

                          {/* Destination Ward */}
                          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />

                              <span className="text-xs font-bold uppercase text-emerald-700">
                                Receiving Ward
                              </span>
                            </div>

                            <p className="text-lg font-extrabold text-gray-900 mt-2">
                              {transfer.to_ward}
                            </p>

                            <p className="text-xs text-gray-600 mt-1">
                              Estimated capacity:{" "}
                              {formatNumber(destination?.bed_capacity)} beds
                            </p>

                            <p className="text-xs text-emerald-700 font-semibold mt-1">
                              Total received:{" "}
                              {formatNumber(destination?.received_in)} patients
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <p className="text-emerald-700 font-bold">
                      No overflow transfers required
                    </p>

                    <p className="text-sm text-emerald-700 mt-1">
                      All wards in {selectedCity} are within their estimated
                      local bed capacity.
                    </p>
                  </div>
                )}
              </div>

              {/* Unmet Deficits */}
              {unmetWards.length > 0 && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <h3 className="text-sm font-extrabold text-red-800">
                    ⚠ Unresolved Hospital Capacity Shortages
                  </h3>

                  <p className="text-xs text-red-700 mt-1 mb-3">
                    These wards still have patients who could not be routed
                    because the city has insufficient remaining capacity.
                  </p>

                  <div className="space-y-2">
                    {unmetWards.map((ward) => (
                      <div
                        key={ward.ward_id}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white border border-red-200"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {ward.ward_id}
                          </p>

                          <p className="text-xs text-gray-500">
                            {formatNumber(ward.overflow_out)} patients routed
                            out of {formatNumber(ward.overflow)} overflow
                          </p>
                        </div>

                        <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-extrabold">
                          {formatNumber(ward.net_deficit)} unmet
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Capacity Notes */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <strong>How routing works:</strong> The backend prioritizes
                  overloaded wards and transfers patients to the least-utilized
                  eligible ward with available estimated capacity. Transfers
                  are restricted to wards within the same city.
                </p>

                <p className="text-xs text-gray-500 mt-2">
                  Bed capacity is estimated using the project's existing
                  capacity formula; it is not a live hospital bed availability
                  feed.
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  Forecast data date: {overflowData.data_date || "Unavailable"}
                  {" • "}
                  {overflowData.offline_fallback
                    ? "Offline snapshot"
                    : "Backend data"}
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default RiskMap;
