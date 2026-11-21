"use client";
import React, { useState, useEffect, useMemo } from "react";
import { fetchWardsData, fetchWardPrediction } from "../../lib/api";
import OverviewHeader from "./OverviewHeader";
import OverviewKpiGrid from "./OverviewKpiGrid";
import OverviewAnalytics from "./OverviewAnalytics";

const TIER_MAP = {
  Critical: { score: 88, badge: "bg-red-100 text-red-700 border-red-300" },
  High: { score: 74, badge: "bg-amber-100 text-amber-800 border-amber-300" },
  Medium: { score: 55, badge: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  Low: { score: 32, badge: "bg-emerald-100 text-emerald-700 border-emerald-300" },
};

const PALETTE = [
  { textColor: "text-red-600", barColor: "bg-red-600" },
  { textColor: "text-amber-600", barColor: "bg-amber-500" },
  { textColor: "text-blue-600", barColor: "bg-blue-500" },
  { textColor: "text-slate-600", barColor: "bg-slate-600" },
];

const normalizeCity = (c = "") => {
  const s = String(c).trim().toLowerCase();
  if (s.includes("chittagong") || s.includes("chattogram")) return "chattogram";
  return s;
};

const getTier = (raw = "") => {
  const s = String(raw).toLowerCase();
  return s.includes("crit") ? "Critical" : s.includes("high") ? "High" : s.includes("med") || s.includes("mod") ? "Medium" : "Low";
};

const Overview = ({ selectedCity }) => {
  const [wardsByCity, setWardsByCity] = useState({});
  const [selectedWardId, setSelectedWardId] = useState("");
  const [forecastWindow, setForecastWindow] = useState("2 Weeks");
  const [prediction, setPrediction] = useState(null);
  const [apiError, setApiError] = useState("");
  const [wardsLoaded, setWardsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchWardsData();
        const rawList = Array.isArray(res) ? res : res.wards || res.data || [];
        if (!active) return;

        const grouped = {};
        rawList.forEach((w) => {
          const key = normalizeCity(w.city || w.city_name);
          const id = w.ward_id || w.id;
          if (key && id) {
            (grouped[key] ||= []).push({ id, name: w.ward_name || id, ...w });
          }
        });
        setWardsByCity(grouped);
        setApiError("");
      } catch (err) {
        if (active) setApiError(err.message || "Failed to connect to API");
      } finally {
        if (active) setWardsLoaded(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const currentWards = useMemo(
    () => wardsByCity[normalizeCity(selectedCity)] || [],
    [wardsByCity, selectedCity]
  );

  const activeWardId = currentWards.some((w) => w.id === selectedWardId) ? selectedWardId : currentWards[0]?.id || "";
  const baseWard = currentWards.find((w) => w.id === activeWardId) || currentWards[0] || null;

  useEffect(() => {
    if (!baseWard?.id) return;
    let active = true;
    (async () => {
      try {
        const data = await fetchWardPrediction(baseWard.id);
        if (active) { setPrediction(data); setApiError(""); }
      } catch (err) {
        if (active) setApiError(err.message || "Prediction fetch failed");
      }
    })();
    return () => { active = false; };
  }, [baseWard?.id]);

  const isLoading = !apiError && (!wardsLoaded || Boolean(baseWard?.id && prediction?.ward_id !== baseWard.id));
  const horizon = forecastWindow === "4 Weeks" ? 4 : forecastWindow === "3 Weeks" ? 3 : 2;
  const forecast = prediction?.forecasts?.find((f) => f.horizon_weeks === horizon);

  const activeWard = useMemo(() => {
    const w = prediction?.weather || {};
    const predCases = Math.round(Number(forecast?.predicted_cases ?? 0));

    const loggingDriver = prediction?.drivers?.find((d) => d.factor?.includes("Water-Logging"));
    const vulnDriver = prediction?.drivers?.find((d) => d.factor?.includes("Vulnerability"));
    const vulnParts = String(vulnDriver?.value || "").match(/([\d,]+)\/sqkm\s*\|\s*Sanitation\s*([\d.]+)/i);

    const popVal = Number(baseWard?.population_density_sqkm ?? (vulnParts ? vulnParts[1].replace(/,/g, "") : 0));
    const sanVal = Number(baseWard?.sanitation_score ?? (vulnParts ? vulnParts[2] : 0.5));
    const logVal = Number(baseWard?.water_logging_risk_index ?? loggingDriver?.value ?? 0.5);
    const tempVal = Number(w.avg_temp_c ?? 0);

    return {
      ...(baseWard || {}),
      id: baseWard?.id || activeWardId || "Loading...",
      name: baseWard?.name || activeWardId || "Loading Ward...",
      currentCases: Number(prediction?.current_cases ?? 0),
      predictedCases: predCases,
      peakCases: predCases,
      laggedRainfall: Number(w.rainfall_mm ?? w.rainfall_prev_4w_sum ?? 0),
      humidity: Number(w.relative_humidity_pct ?? 0),
      avgTemp: tempVal,
      temperature: tempVal,
      temp: tempVal,
      waterLogging: logVal,
      sanitation: sanVal,
      popDensity: popVal,
      populationDensity: popVal,
      dataDate: prediction?.data_date || "",
    };
  }, [baseWard, activeWardId, prediction, forecast]);

  const riskTier = getTier(forecast?.risk_level);
  const { score: riskScore, badge: riskBadgeStyle } = TIER_MAP[riskTier];
  const earlyWarningDays = forecastWindow === "4 Weeks" ? 26 : forecastWindow === "3 Weeks" ? 21 : 15;

  const drivers = useMemo(() => {
    if (Array.isArray(prediction?.drivers) && prediction.drivers.length) {
      return prediction.drivers.slice(0, 4).map((d, i) => ({
        label: d.factor || d.label || `Driver ${i + 1}`,
        code: d.value || null,
        pct: Math.round(Number(d.score ?? d.pct ?? 25)),
        ...PALETTE[i % 4],
      }));
    }
    return [
      { label: "Multi-Week Rainfall", code: "rainfall_mm", pct: 35, ...PALETTE[0] },
      { label: "Water-Logging Risk", code: "water_logging_risk_index", pct: 30, ...PALETTE[1] },
      { label: "Average Temperature", code: "avg_temp_c", pct: 20, ...PALETTE[2] },
      { label: "Relative Humidity", code: "relative_humidity_pct", pct: 15, ...PALETTE[3] },
    ];
  }, [prediction]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${apiError ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
          <span className="font-semibold text-slate-700">
            {apiError
              ? `API Disconnected: ${apiError}`
              : `Live ML API Connected • ${selectedCity} (${currentWards.length} wards)`}
          </span>
        </div>

        {isLoading ? (
          <span className="text-red-600 font-semibold animate-pulse">Fetching live ML predictions...</span>
        ) : (
          forecast && (
            <span className="font-bold text-slate-800">
              {forecastWindow} Forecast:{" "}
              <span className="text-red-600">{Math.round(forecast.predicted_cases)} predicted cases</span>
            </span>
          )
        )}
      </div>

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
        predictedCases={forecast?.predicted_cases}
        isLiveApi={!apiError}
      />

      <OverviewAnalytics activeWard={activeWard} drivers={drivers} />
    </div>
  );
};

export default Overview;