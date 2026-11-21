"use client";
import React, { useState } from "react";
import { WARD_DATA } from "../DengueData";

const WardMonitoring = ({ selectedCity }) => {
  const wards = WARD_DATA[selectedCity] || WARD_DATA["Chattogram"];
  const [searchTerm, setSearchTerm] = useState("");

  
  const enrichedWards = wards
    .map((w) => {
      const score = Math.min(
        99,
        Math.round(
          w.laggedRainfall * 0.25 +
            w.waterLogging * 30 +
            (1 - w.sanitation) * 15
        )
      );

      let status = "Low";
      let badgeStyle = "bg-emerald-100 text-emerald-700";
      let action = "Routine Weekly Surveillance";

      if (score >= 80) {
        status = "Critical";
        badgeStyle = "bg-red-100 text-red-700";
        action = "Immediate Larvicide & Drainage Clearance";
      } else if (score >= 65) {
        status = "High";
        badgeStyle = "bg-amber-100 text-amber-800";
        action = "Deploy Fogging & Hotspot Inspection";
      } else if (score >= 45) {
        status = "Moderate";
        badgeStyle = "bg-yellow-100 text-yellow-800";
        action = "Drainage Monitoring & Awareness";
      }

      return { ...w, score, status, badgeStyle, action };
    })
    .filter((w) =>
      w.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
            Municipal Surveillance Directory
          </span>
          <h2 className="text-xl font-bold text-gray-800">
            Ward-Level Risk & Vector Monitoring ({selectedCity})
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time vulnerability & vector breeding risk breakdown across {wards.length} wards
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
            {enrichedWards.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50/80 transition">
                <td className="py-3 px-4 font-bold text-gray-800">{w.id}</td>
                <td className="py-3 px-4 text-blue-600 font-medium">
                  {w.laggedRainfall} mm
                </td>
                <td className="py-3 px-4 font-medium text-gray-700">
                  {w.waterLogging} / 1.0
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {w.sanitation} / 1.0
                </td>
                <td className="py-3 px-4 font-extrabold text-gray-900">
                  {w.score} <span className="text-xs font-normal text-gray-400">/ 100</span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${w.badgeStyle}`}
                  >
                    {w.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 font-medium">
                  {w.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WardMonitoring;