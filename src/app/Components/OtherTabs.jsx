"use client";
import React, { useState } from "react";
import { WARD_DATA } from "../DengueData";

const calcScore = (w) =>
  Math.min(99, Math.round(w.laggedRainfall * 0.25 + w.waterLogging * 30 + (1 - w.sanitation) * 15));

export const Alerts = ({ selectedCity }) => {
  const wards = WARD_DATA[selectedCity] || WARD_DATA["Chattogram"];
  const highRisk = wards.map((w) => ({ ...w, score: calcScore(w) })).filter((w) => w.score >= 65);

  return (
    <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Alerts &amp; Recommendations — {selectedCity}</h2>
      <div className="p-4 bg-red-50/90 border-l-4 border-red-600 rounded-r-xl text-sm text-red-700">
        <p className="font-bold text-red-800">🚨 Priority Alert ({highRisk.length} Wards ≥ 65 Risk)</p>
        <p className="mt-1">
          {highRisk.length
            ? `Deploy larvicide & drainage clearance in: ${highRisk.slice(0, 4).map((w) => `${w.id} (${w.score})`).join(", ")}.`
            : `No critical threshold breached in ${selectedCity}. Continue routine checks.`}
        </p>
      </div>
      <div className="p-4 bg-blue-50/90 border-l-4 border-blue-600 rounded-r-xl text-sm text-blue-700">
        <p className="font-bold text-blue-800">🩺 Clinical Advisory</p>
        <p className="mt-1">Advise NS1 Antigen &amp; CBC testing for fever cases lasting &gt; 48 hours.</p>
      </div>
    </div>
  );
};

export const Reports = ({ selectedCity }) => {
  const wards = WARD_DATA[selectedCity] || WARD_DATA["Chattogram"];

  const downloadCSV = () => {
    const csv = [
      "Ward_ID,City,Rainfall_mm,Water_Logging,Sanitation,Peak_Cases,Risk_Score",
      ...wards.map((w) => `${w.id},${selectedCity},${w.laggedRainfall},${w.waterLogging},${w.sanitation},${w.peakCases},${calcScore(w)}`),
    ].join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${selectedCity}_Dengue_Report.csv`;
    a.click();
  };

  return (
    <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Data &amp; Reports — {selectedCity}</h2>
      <p className="text-sm text-gray-600">Export {wards.length}-ward risk &amp; vector surveillance dataset.</p>
      <button onClick={downloadCSV} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer">
        ⬇️ Download CSV ({selectedCity})
      </button>
    </div>
  );
};

export const Settings = () => {
  const [sms, setSms] = useState(true);
  const [sync, setSync] = useState(true);

  return (
    <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm max-w-md space-y-3 text-sm text-gray-700">
      <h2 className="text-xl font-bold text-gray-800">System Settings</h2>
      <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80">
        <span>Critical Ward SMS Alerts</span>
        <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="accent-red-600" />
      </label>
      <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80">
        <span>Auto-sync BMD Weather Data</span>
        <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} className="accent-red-600" />
      </label>
    </div>
  );
};

export const HelpAbout = () => (
  <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm max-w-xl space-y-2 text-sm text-gray-600">
    <h2 className="text-xl font-bold text-gray-800">About AI Dengue Surveillance</h2>
    <p>Predicts ward-level dengue outbreaks 2–4 weeks ahead using 31,320 historical records across 60 wards (MAE: 0.86, R²: 0.82).</p>
  </div>
);