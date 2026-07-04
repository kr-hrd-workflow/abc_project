import { buildRealSampleIntakePackage } from "../../../lib/realSampleIntakePackage";

export function GET() {
  return Response.json(buildRealSampleIntakePackage(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
