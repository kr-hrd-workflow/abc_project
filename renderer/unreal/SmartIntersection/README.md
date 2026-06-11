# Smart Intersection Unreal Renderer

This folder is the Unreal Engine side of the abc_project photoreal digital twin.

## Purpose

- Keep FastAPI/SUMO/TraCI as the source of truth for traffic state.
- Use Unreal Engine as the photoreal presentation layer.
- Stream the Unreal viewport into the existing dashboard through Pixel Streaming.

## Expected local URL

The web dashboard is already wired to prefer:

```env
NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1
```

When the Pixel Streaming frontend is running on `http://127.0.0.1`, the dashboard viewport can mount it directly. Unreal connects to the streamer WebSocket separately at `ws://127.0.0.1:8888`.

## First editor steps

1. Install Unreal Engine 5.x from Epic Games Launcher.
2. Open `SmartIntersection.uproject`.
3. Accept any prompt to associate the project with the installed engine version.
4. Confirm the Pixel Streaming plugin is enabled.
5. Create the first level with:
   - one four-way intersection,
   - simple road meshes,
   - traffic lights,
   - vehicle placeholders,
   - one CCTV-style CineCameraActor.
6. Save the map as `Content/Maps/SmartIntersection.umap`.
7. Set it as the default map in Project Settings.

## Runtime intent

The first production-quality integration should be read-only:

```text
FastAPI /api/status + /api/simulate
        ↓
Unreal polling or WebSocket bridge
        ↓
Photoreal scene state update
        ↓
Pixel Streaming frontend
        ↓
Next.js dashboard iframe slot
```

Do not connect this demo to real signal controllers. It remains simulation-only/operator decision support.
