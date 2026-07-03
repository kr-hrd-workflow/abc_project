import { buildFinalLocalReadinessExport } from "../../../lib/finalLocalReadiness";

export function GET() {
  return Response.json(buildFinalLocalReadinessExport(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
