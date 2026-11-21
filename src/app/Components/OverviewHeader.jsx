import React from "react";

const OverviewHeader = ({
  selectedCity,
  currentWards,
  activeWard,
  setSelectedWardId,
  forecastWindow,
  setForecastWindow,
}) => {
  return (
    <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
          Early-Warning Surveillance ({currentWards.length} Wards Tracked)
        </span>
        <h2 className="text-xl font-bold text-gray-800">
          {selectedCity} — {activeWard.id}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Ward ID:{" "}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded font-semibold text-gray-700">
            {activeWard.id}
          </code>{" "}
          - Historical Peak Weekly Cases:{" "}
          <strong>{activeWard.peakCases}</strong>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Target Ward (
            <code className="text-[11px] bg-gray-100 px-1 rounded text-gray-700">
              ward_id
            </code>
            )
          </label>
          <select
            value={activeWard.id}
            onChange={(e) => setSelectedWardId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-medium text-gray-800 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
          >
            {currentWards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Forecast Window
          </label>
          <select
            value={forecastWindow}
            onChange={(e) => setForecastWindow(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-medium text-gray-800 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
          >
            <option value="2 Weeks">Next 2 Weeks</option>
            <option value="3 Weeks">Next 3 Weeks</option>
            <option value="4 Weeks">Next 4 Weeks</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default OverviewHeader;