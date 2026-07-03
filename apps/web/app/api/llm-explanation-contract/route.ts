import { buildLlmExplanationContractExport } from "../../../lib/llmExplanationContract";

export function GET() {
  return Response.json(buildLlmExplanationContractExport(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
