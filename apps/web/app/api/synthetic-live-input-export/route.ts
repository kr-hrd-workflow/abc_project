import {
  buildSyntheticLiveInputJsonExport,
  resolveSyntheticLiveInputExportOptions
} from "../../../lib/syntheticLiveInputDataset";

export function GET(request: Request) {
  const url = new URL(request.url);
  const options = resolveSyntheticLiveInputExportOptions(url.searchParams.get("size"));

  return Response.json(
    buildSyntheticLiveInputJsonExport(options),
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
