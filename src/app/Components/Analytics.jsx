import React from "react";

const Analytics = ({ selectedCity }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Trend Analytics — {selectedCity}
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Monthly infection trends vs. weather humidity & temperature correlation.
      </p>
      <div className="h-64 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center text-gray-500 text-center p-4">
        📈 Chart Area (Recharts / Chart.js)
      </div>
    </div>
  );
};

export default Analytics;