import { buildRealSampleSourceSchemaExport } from "../../../lib/realSampleSourceSchema";

export function GET() {
  return Response.json(buildRealSampleSourceSchemaExport(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
