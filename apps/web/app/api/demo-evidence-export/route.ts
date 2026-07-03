import { buildDemoEvidenceExport } from "../../../lib/demoEvidenceExport";

export function GET() {
  return Response.json(buildDemoEvidenceExport(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
