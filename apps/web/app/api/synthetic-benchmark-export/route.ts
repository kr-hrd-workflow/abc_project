import { buildSyntheticBenchmarkExport } from "../../../lib/syntheticBenchmarkExport";

export function GET() {
  return Response.json(buildSyntheticBenchmarkExport(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
