/** Prints the materialized demo candidates for a given instant as JSON (for UI fixtures / Lovable). */
import { buildDemoCandidates } from "../src/demo/demoData";

const now = process.argv[2] ?? new Date().toISOString();
console.log(JSON.stringify(buildDemoCandidates(now), null, 2));
