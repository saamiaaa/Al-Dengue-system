const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:5000";
const DEFAULT_DATE = "2025-08-25";
const SNAPSHOT_DATES = [
  "2025-06-16",
  "2025-08-25",
  "2025-10-20",
  "2025-11-10",
  "2025-12-15",
  "2025-12-29",
];

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(`${url} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function fetchSnapshotForDate(date) {
  const [alloc2, alloc3, alloc4, overflow2, overflow3, overflow4, simulate] =
    await Promise.all([
      fetchJson(`${BASE}/api/allocation?horizon=2&stock=100&crews=20&date=${date}`),
      fetchJson(`${BASE}/api/allocation?horizon=3&stock=100&crews=20&date=${date}`),
      fetchJson(`${BASE}/api/allocation?horizon=4&stock=100&crews=20&date=${date}`),
      fetchJson(`${BASE}/api/overflow?horizon=2&date=${date}`),
      fetchJson(`${BASE}/api/overflow?horizon=3&date=${date}`),
      fetchJson(`${BASE}/api/overflow?horizon=4&date=${date}`),
      fetchJson(`${BASE}/api/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, deployed_crews: {} }),
      }),
    ]);

  return {
    allocation_base: { 2: alloc2, 3: alloc3, 4: alloc4 },
    overflow_by_horizon: { 2: overflow2, 3: overflow3, 4: overflow4 },
    simulate_preview: simulate,
  };
}

async function createOfflineSnapshot() {
  const wards = await fetchJson(`${BASE}/api/wards`);

  const byDate = {};
  for (const date of SNAPSHOT_DATES) {
    console.log(`Fetching snapshot for ${date}...`);
    byDate[date] = await fetchSnapshotForDate(date);
  }

  const defaultPack = byDate[DEFAULT_DATE];
  const snapshot = {
    data_date: DEFAULT_DATE,
    snapshot_dates: SNAPSHOT_DATES,
    wards_meta: wards,
    allocation_base: defaultPack.allocation_base,
    overflow_by_horizon: defaultPack.overflow_by_horizon,
    simulate_preview: defaultPack.simulate_preview,
    by_date: byDate,
  };

  const outDir = path.join(__dirname, "src", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "offline_snapshot.json");
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));

  console.log(`SUCCESS! Saved ${SNAPSHOT_DATES.length} dates (60 wards each) to ${outPath}`);
}

createOfflineSnapshot().catch((err) => {
  console.error("Snapshot failed:", err.message);
  process.exit(1);
});