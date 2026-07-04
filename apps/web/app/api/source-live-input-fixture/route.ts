import { buildSourceSpecificLiveInputExport } from "../../../lib/sourceLiveInputAdapter";

export function GET() {
  return Response.json(buildSourceSpecificLiveInputExport(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
