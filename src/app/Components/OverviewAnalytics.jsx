import React from "react";

const OverviewAnalytics = ({ activeWard, drivers }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-800">
            📊 Outbreak Risk Driver Breakdown
          </h3>
          <p className="text-xs text-gray-500">
            Contribution of lagged weather &amp; ward features (31,320-record
            dataset)
          </p>
        </div>

        <div className="space-y-3 text-sm">
          {drivers.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between font-medium mb-1">
                <span>
                  {item.label}
                  {item.code && (
                    <>
                      {" "}
                      (
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                        {item.code}
                      </code>
                      )
                    </>
                  )}
                </span>
                <span className={`${item.textColor} font-bold`}>
                  {item.pct}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`${item.barColor} h-2.5 rounded-full transition-all duration-500`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-800">
            🏘️ Hyper-Local Ward Vulnerability ({activeWard.id})
          </h3>
          <p className="text-xs text-gray-500">
            Normalized structural metrics (0.0 – 1.0 scale) from dataset
          </p>

          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-gray-600">Water Logging</p>
              <p className="text-lg font-extrabold text-red-700 mt-1">
                {activeWard.waterLogging} / 1.0
              </p>
              <p className="text-[11px] text-red-600">
                {activeWard.waterLogging >= 0.7
                  ? "Severe Bottleneck"
                  : "Moderate Drainage"}
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-gray-600">Population Density</p>
              <p className="text-lg font-extrabold text-amber-700 mt-1">
                {activeWard.popDensity.toLocaleString()}
              </p>
              <p className="text-[11px] text-amber-600">per sq.km</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-gray-600">Sanitation Score</p>
              <p className="text-lg font-extrabold text-slate-800 mt-1">
                {activeWard.sanitation} / 1.0
              </p>
              <p className="text-[11px] text-slate-600">
                {activeWard.sanitation <= 0.45
                  ? "Weak Waste Mgmt"
                  : "Moderate Sanitation"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-r-lg">
          <h4 className="text-xs font-bold uppercase text-red-800">
            🚨 Recommended Preventive Intervention
          </h4>
          <p className="text-xs text-red-700 mt-1 leading-relaxed">
            Deploy larvicide spraying &amp; drainage clearance teams to{" "}
            <strong>{activeWard.id}</strong> within 72 hours. Stagnant water
            from the recent <strong>{activeWard.laggedRainfall} mm</strong>{" "}
            rainfall event combined with{" "}
            <strong>{activeWard.waterLogging}</strong> water-logging risk is
            entering peak mosquito maturation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OverviewAnalytics;