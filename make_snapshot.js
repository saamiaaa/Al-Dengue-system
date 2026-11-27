const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:5000";
const DEMO_DATE = "2025-08-25";

async function createOfflineSnapshot() {
    const [wards, alloc2, alloc3, alloc4, overflow2, overflow3, overflow4, simulate] = await Promise.all([
        fetch(`${BASE}/api/wards`).then((r) => r.json()),
        fetch(`${BASE}/api/allocation?horizon=2&stock=100&crews=20&date=${DEMO_DATE}`).then((r) => r.json()),
        fetch(`${BASE}/api/allocation?horizon=3&stock=100&crews=20&date=${DEMO_DATE}`).then((r) => r.json()),
        fetch(`${BASE}/api/allocation?horizon=4&stock=100&crews=20&date=${DEMO_DATE}`).then((r) => r.json()),
        fetch(`${BASE}/api/overflow?horizon=2&date=${DEMO_DATE}`).then((r) => r.json()),
        fetch(`${BASE}/api/overflow?horizon=3&date=${DEMO_DATE}`).then((r) => r.json()),
        fetch(`${BASE}/api/overflow?horizon=4&date=${DEMO_DATE}`).then((r) => r.json()),
        fetch(`${BASE}/api/simulate?date=${DEMO_DATE}`).then((r) => r.json()),
    ]);

    const snapshot = {
        data_date: DEMO_DATE,
        wards_meta: wards,
        allocation_base: { 2: alloc2, 3: alloc3, 4: alloc4 },
        overflow_by_horizon: { 2: overflow2, 3: overflow3, 4: overflow4 },
        simulate_preview: simulate,
    };

    const outDir = path.join(__dirname, "src", "data");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "offline_snapshot.json"), JSON.stringify(snapshot, null, 2));
    console.log("Saved real offline snapshot to src/data/offline_snapshot.json");
}

createOfflineSnapshot().catch((err) => console.error("Start Python (8000) and Express (5000) first:", err.message));