import React from "react";

const Overview = ({ selectedCity }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">
        System Overview — {selectedCity}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Active Cases ({selectedCity})</p>
          <p className="text-3xl font-bold text-red-600 mt-1">1,245</p>
          <p className="text-xs text-red-500 mt-2">↑ 8% from last week</p>
        </div>
        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">AI Predicted Risk Level</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">High</p>
          <p className="text-xs text-gray-500 mt-2">Based on humidity & rainfall</p>
        </div>
        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Available Hospital Beds</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">340</p>
          <p className="text-xs text-emerald-600 mt-2">Across 12 dengue wards</p>
        </div>
      </div>
    </div>
  );
};

export default Overview;