"use client";
import React, { useState, useEffect } from "react";
import { fetchWardsData, fetchWardPrediction } from "../../lib/api";

const STATUS_META = {
  Critical: { score: 88, badge: "bg-red-100 text-red-700", action: "Immediate Larvicide & Drainage Clearance" },
  High: { score: 74, badge: "bg-amber-100 text-amber-800", action: "Deploy Fogging & Hotspot Inspection" },
  Moderate: { score: 55, badge: "bg-yellow-100 text-yellow-800", action: "Drainage Monitoring & Awareness" },
  Low: { score: 32, badge: "bg-emerald-100 text-emerald-700", action: "Routine Weekly Surveillance" },
};

const getStatus = (raw = "") => {
  const s = String(raw).toLowerCase();
  return s.includes("crit") ? "Critical" : s.includes("high") ? "High" : s.includes("med") || s.includes("mod") ? "Moderate" : "Low";
};

const WardMonitoring = ({ selectedCity }) => {
  const [wards, setWards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadedCity, setLoadedCity] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchWardsData();
        const list = (res.wards || []).filter((w) => w.city === selectedCity);
        const preds = await Promise.all(
          list.map((w) => fetchWardPrediction(w.ward_id).catch(() => null))
        );
        if (!active) return;

        setWards(
          list.map((w, i) => {
            const p = preds[i];
            const f2 = p?.forecasts?.find((f) => f.horizon_weeks === 2);
            const status = getStatus(f2?.risk_level);
            return {
              id: w.ward_id,
              status,
              ...STATUS_META[status],
              rain: Number(p?.weather?.rainfall_prev_2w_sum ?? p?.weather?.rainfall_mm ?? 0).toFixed(1),
              logging: Number(w.water_logging_risk_index ?? 0.5).toFixed(2),
              sanitation: Number(w.sanitation_score ?? 0.5).toFixed(2),
            };
          })
        );
        setError(false);
      } catch {
        if (active) { setWards([]); setError(true); }
      } finally {
        if (active) setLoadedCity(selectedCity);
      }
    })();
    return () => { active = false; };
  }, [selectedCity]);

  const isLoading = !error && loadedCity !== selectedCity;
  const filtered = wards.filter((w) =>
    w.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
            Municipal Surveillance Directory • {error ? "API OFFLINE" : "LIVE ML"}
          </span>
          <h2 className="text-xl font-bold text-gray-800">
            Ward-Level Risk &amp; Vector Monitoring ({selectedCity})
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time vulnerability &amp; vector breeding risk breakdown across {wards.length} wards
          </p>
        </div>

        <input
          type="text"
          placeholder="Search ward (e.g., Ward_01)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-lg px-3.5 py-2 text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-64"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[680px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-600">
              <th className="py-3 px-4">Ward ID</th>
              <th className="py-3 px-4">2–3 Wk Rainfall</th>
              <th className="py-3 px-4">Water Logging</th>
              <th className="py-3 px-4">Sanitation</th>
              <th className="py-3 px-4">Risk Score</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Action Priority</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-500 animate-pulse">
                  Loading live ward surveillance data...
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50/80 transition">
                  <td className="py-3 px-4 font-bold text-gray-800">{w.id}</td>
                  <td className="py-3 px-4 text-blue-600 font-medium">{w.rain} mm</td>
                  <td className="py-3 px-4 font-medium text-gray-700">{w.logging} / 1.0</td>
                  <td className="py-3 px-4 text-gray-600">{w.sanitation} / 1.0</td>
                  <td className="py-3 px-4 font-extrabold text-gray-900">
                    {w.score} <span className="text-xs font-normal text-gray-400">/ 100</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${w.badge}`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-600 font-medium">{w.action}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-500">
                  No matching wards found for {selectedCity}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WardMonitoring;