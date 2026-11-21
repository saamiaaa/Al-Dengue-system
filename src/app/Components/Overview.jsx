"use client";
import React, { useState } from "react";
import { WARD_DATA } from "../DengueData";
import OverviewHeader from "./OverviewHeader";
import OverviewKpiGrid from "./OverviewKpiGrid";
import OverviewAnalytics from "./OverviewAnalytics";

const Overview = ({ selectedCity }) => {
  const currentWards = WARD_DATA[selectedCity] || WARD_DATA["Chattogram"];
  const [selectedWardId, setSelectedWardId] = useState(currentWards[0].id);
  const [forecastWindow, setForecastWindow] = useState("2 Weeks");

  const activeWard =
    currentWards.find((w) => w.id === selectedWardId) || currentWards[0];

  const horizonBoost =
    forecastWindow === "4 Weeks" ? 10 : forecastWindow === "3 Weeks" ? 5 : 0;

  const riskScore = Math.min(
    99,
    Math.round(
      activeWard.laggedRainfall * 0.25 +
        activeWard.waterLogging * 30 +
        (1 - activeWard.sanitation) * 15 +
        horizonBoost
    )
  );

  const riskTier =
    riskScore >= 80
      ? "Critical"
      : riskScore >= 65
      ? "High"
      : riskScore >= 45
      ? "Medium"
      : "Low";

  const earlyWarningDays =
    forecastWindow === "4 Weeks" ? 26 : forecastWindow === "3 Weeks" ? 21 : 15;

  const riskBadgeStyle =
    riskTier === "Critical"
      ? "bg-red-100 text-red-700 border-red-300"
      : riskTier === "High"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : riskTier === "Medium"
      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
      : "bg-emerald-100 text-emerald-700 border-emerald-300";

  const rawRain = activeWard.laggedRainfall * 0.25;
  const rawWater = activeWard.waterLogging * 30;
  const rawHumidity = (activeWard.humidity / 100) * 15;
  const rawSanitation = (1 - activeWard.sanitation) * 15;
  const totalRaw = rawRain + rawWater + rawHumidity + rawSanitation || 1;

  const rainPct = Math.round((rawRain / totalRaw) * 100);
  const waterPct = Math.round((rawWater / totalRaw) * 100);
  const humidityPct = Math.round((rawHumidity / totalRaw) * 100);
  const sanitationPct = Math.max(0, 100 - (rainPct + waterPct + humidityPct));

  const drivers = [
    {
      label: "Multi-Week Rainfall Lag",
      code: "rainfall_mm",
      pct: rainPct,
      textColor: "text-red-600",
      barColor: "bg-red-600",
    },
    {
      label: "Drainage & Water Logging",
      code: "water_logging_risk_index",
      pct: waterPct,
      textColor: "text-amber-600",
      barColor: "bg-amber-500",
    },
    {
      label: "Humidity & Temperature",
      code: "relative_humidity_pct",
      pct: humidityPct,
      textColor: "text-blue-600",
      barColor: "bg-blue-500",
    },
    {
      label: "Population Crowding & Sanitation Score",
      code: null,
      pct: sanitationPct,
      textColor: "text-slate-600",
      barColor: "bg-slate-600",
    },
  ];

  return (
    <div className="space-y-6">
      <OverviewHeader
        selectedCity={selectedCity}
        currentWards={currentWards}
        activeWard={activeWard}
        setSelectedWardId={setSelectedWardId}
        forecastWindow={forecastWindow}
        setForecastWindow={setForecastWindow}
      />

      <OverviewKpiGrid
        riskScore={riskScore}
        riskTier={riskTier}
        riskBadgeStyle={riskBadgeStyle}
        forecastWindow={forecastWindow}
        activeWard={activeWard}
        earlyWarningDays={earlyWarningDays}
      />

      <OverviewAnalytics activeWard={activeWard} drivers={drivers} />
    </div>
  );
};

export default Overview;