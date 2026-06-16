# Unreal Pixel Streaming Setup

This project uses Unreal Engine as a photoreal presentation layer and keeps FastAPI/SUMO/TraCI as the traffic-state source of truth.

## Current dashboard contract

The web dashboard mounts a stream iframe from:

```env
NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1
```

The old Unity variable remains a fallback alias:

```env
NEXT_PUBLIC_UNITY_WEBGL_URL=/unity/index.html
```

## Commands

Run all commands from the repository root.

### At-home one-command continuation

After you sign in to Epic Games Launcher and install Unreal Engine 5.x, run:

```bash
npm run unreal:home
```

That command performs the remaining local steps in order:

1. verifies `UnrealEditor.exe` exists,
2. ensures both root `.env.local` and `apps/web/.env.local` contain `NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1`,
3. starts the Pixel Streaming signalling server,
4. opens `renderer/unreal/SmartIntersection/SmartIntersection.uproject` in runtime mode with Unreal streamer flags: `-game -PixelStreamingURL=ws://127.0.0.1:8888 -RenderOffscreen -AudioMixer`.

If Unreal is still missing, it stops with the exact blocker and leaves the repo unchanged.

### 1. Check local Unreal/Epic installation

```bash
npm run unreal:precheck
```

Expected states:

- `UNREAL_EDITOR_FOUND=...`: Unreal Engine is installed.
- `EPIC_LAUNCHER_FOUND=...` and `UNREAL_EDITOR_FOUND=false`: open Epic Games Launcher, sign in, install Unreal Engine 5.x.
- both false: install Epic Games Launcher first.

### 2. Open the project

```bash
npm run unreal:open
```

If Unreal is installed, this opens:

```text
renderer/unreal/SmartIntersection/SmartIntersection.uproject
```

If Unreal is not installed, the command launches Epic Games Launcher.

### 3. Start Pixel Streaming signalling

```bash
npm run unreal:pixel-streaming
```

The script discovers the installed Unreal Engine folder and tries to start the bundled Pixel Streaming signalling server. UE 5.7 installations may include the Pixel Streaming plugin but not the old `Resources/WebServers` startup scripts; in that case the script falls back to cloning Epic's `EpicGamesExt/PixelStreamingInfrastructure` into ignored local scratch space at `tmp/PixelStreamingInfrastructure` and starts `SignallingWebServer/platform_scripts/cmd/start.bat`. The expected frontend URL is:

```text
http://127.0.0.1
```

Unreal connects to the streamer WebSocket separately:

```text
ws://127.0.0.1:8888
```

If a browser request to `http://127.0.0.1:8888` returns `426 Upgrade Required`, that is expected. Port `8888` is not the dashboard iframe URL.

### 4. Start the app

```bash
npm run launch:local
```

Then open:

```text
http://127.0.0.1:3000/dashboard
```

## First Unreal editor checklist

After Unreal opens the `.uproject`:

1. Accept the prompt to associate the project with the installed UE 5.x version.
2. Confirm the `PixelStreaming` plugin is enabled.
3. Create a level named `SmartIntersection`.
4. Add a four-way intersection blockout.
5. Add traffic light meshes or placeholders.
6. Add vehicle placeholders.
7. Add a CCTV-style `CineCameraActor` as the default view.
8. Save the level as `Content/Maps/SmartIntersection.umap`.
9. Set that map as the default startup map.
10. Start Pixel Streaming and verify the dashboard iframe loads the stream URL.

## Safety boundary

This renderer must remain simulation-only. Do not connect it to real traffic signal controllers. The dashboard recommendation flow remains operator decision support only.
