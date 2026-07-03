import { buildPolicyScorecardContractExport } from "../../../lib/policyScorecardContractExport";

export function GET() {
  return Response.json(buildPolicyScorecardContractExport(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
