"use client";
import React, { useState } from "react";
import { WARD_DATA } from "../DengueData";

const RiskMap = ({ selectedCity }) => {
  const wards = WARD_DATA[selectedCity] || WARD_DATA["Chattogram"];
  const [selectedWardId, setSelectedWardId] = useState(wards[0].id);
  const [filterTier, setFilterTier] = useState("All");

  
  const enrichedWards = wards.map((w) => {
    const score = Math.min(
      99,
      Math.round(
        w.laggedRainfall * 0.25 +
          w.waterLogging * 30 +
          (1 - w.sanitation) * 15
      )
    );

    if (score >= 80) {
      return {
        ...w,
        score,
        tier: "Critical",
        tileStyle: "bg-red-600 text-white border-red-700 hover:bg-red-700",
        badgeStyle: "bg-red-100 text-red-700 border-red-300",
      };
    }
    if (score >= 65) {
      return {
        ...w,
        score,
        tier: "High",
        tileStyle: "bg-amber-500 text-white border-amber-600 hover:bg-amber-600",
        badgeStyle: "bg-amber-100 text-amber-800 border-amber-300",
      };
    }
    if (score >= 45) {
      return {
        ...w,
        score,
        tier: "Medium",
        tileStyle: "bg-yellow-200 text-gray-900 border-yellow-400 hover:bg-yellow-300",
        badgeStyle: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    }
    return {
      ...w,
      score,
      tier: "Low",
      tileStyle: "bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200",
      badgeStyle: "bg-emerald-100 text-emerald-700 border-emerald-300",
    };
  });

  const filteredWards =
    filterTier === "All"
      ? enrichedWards
      : enrichedWards.filter((w) => w.tier === filterTier);

  const activeWard =
    enrichedWards.find((w) => w.id === selectedWardId) || enrichedWards[0];

  return (
    <div className="space-y-6">
      
      <div className="bg-white/95 backdrop-blur-sm p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
            Geospatial Ward Vulnerability Heatmap
          </span>
          <h2 className="text-xl font-bold text-gray-800">
            {selectedCity} Dengue Hotspot & Ward Risk Map ({wards.length} Wards)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Click any ward zone to inspect multi-week rainfall lag, water logging, and sanitation vulnerability
          </p>
        </div>

       
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {["All", "Critical", "High", "Medium", "Low"].map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                filterTier === tier
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-8 bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 border-b border-gray-100 pb-3">
            <span>
              Showing <strong>{filteredWards.length}</strong> of {wards.length} wards in{" "}
              <strong>{selectedCity}</strong>
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600"></span> Critical (80+)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> High (65–79)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-yellow-300"></span> Medium (45–64)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200"></span> Low (&lt;45)
              </span>
            </div>
          </div>

          {filteredWards.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredWards.map((w) => {
                const isSelected = activeWard?.id === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWardId(w.id)}
                    className={`p-3.5 rounded-xl border-2 text-left transition transform hover:scale-105 cursor-pointer ${
                      w.tileStyle
                    } ${isSelected ? "ring-4 ring-slate-900/35 scale-105" : ""}`}
                  >
                    <p className="text-xs font-bold truncate">{w.id}</p>
                    <p className="text-2xl font-extrabold mt-1">{w.score}</p>
                    <p className="text-[11px] font-medium opacity-95 mt-0.5">
                      {w.tier} Risk
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-gray-500">
              No wards currently fall under the <strong>{filterTier}</strong> risk tier in {selectedCity}.
            </div>
          )}
        </div>

        
        <div className="lg:col-span-4 bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-5">
          {activeWard && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Ward Zone Inspector
                    </p>
                    <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">
                      📍 {activeWard.id}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${activeWard.badgeStyle}`}
                  >
                    {activeWard.tier} ({activeWard.score}/100)
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">2–3 Wk Lagged Rainfall:</span>
                    <span className="font-bold text-blue-600">
                      {activeWard.laggedRainfall} mm
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Water Logging Index:</span>
                    <span className="font-bold text-red-600">
                      {activeWard.waterLogging} / 1.0
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Sanitation Score:</span>
                    <span className="font-bold text-gray-800">
                      {activeWard.sanitation} / 1.0
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Population Density:</span>
                    <span className="font-bold text-gray-800">
                      {activeWard.popDensity.toLocaleString()} / sq.km
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Historical Peak Cases:</span>
                    <span className="font-bold text-amber-700">
                      {activeWard.peakCases} cases/wk
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-r-lg">
                <h4 className="text-xs font-bold uppercase text-red-800">
                  Municipal Action Priority
                </h4>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  {activeWard.tier === "Critical" || activeWard.tier === "High"
                    ? `Priority vector control required in ${activeWard.id}: Clear blocked drains (logging index ${activeWard.waterLogging}) and deploy fogging teams immediately.`
                    : `Maintain routine weekly surveillance and community awareness in ${activeWard.id}.`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskMap;