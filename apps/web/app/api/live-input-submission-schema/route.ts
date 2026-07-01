import { buildLiveInputSubmissionSchemaExport } from "../../../lib/liveInputSubmissionSchema";

export function GET() {
  return Response.json(buildLiveInputSubmissionSchemaExport(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
