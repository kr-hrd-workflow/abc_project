import { buildLiveInputFixtureExport } from "../../../lib/liveInputFixtureExport";

export function GET() {
  return Response.json(buildLiveInputFixtureExport(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
