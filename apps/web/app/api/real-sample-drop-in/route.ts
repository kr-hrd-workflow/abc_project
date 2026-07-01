import {
  buildRealSampleDropInReadiness,
  validateRealSampleDropInEnvelope
} from "../../../lib/realSampleDropIn";

export function GET() {
  return Response.json(buildRealSampleDropInReadiness(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const result = validateRealSampleDropInEnvelope(payload);
  return Response.json(result, {
    status: result.accepted ? 200 : 400,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
