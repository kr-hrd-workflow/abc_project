# Unreal Renderer Is a Simulation Renderer, Not a Game

The `renderer/unreal/SmartIntersection` project is intentionally categorized as **Simulation** in `SmartIntersection.uproject`.

## Why Unreal still looks “game-like”

Unreal Engine packages interactive 3D applications through the same runtime foundation used by games, so the editor, build system, camera actors, lights, maps, and runtime framework often use game-engine terminology. That does **not** mean this project is being designed as a game.

## Project role

- **SUMO/TraCI**: simulation truth source for traffic state and signal behavior.
- **FastAPI**: orchestration/API/RAG layer.
- **Unreal Engine 5.7**: photoreal simulation renderer and Pixel Streaming viewport.
- **Web dashboard**: operator UI and control surface.

## Current implementation language split

- `Content/Python/generate_city_scene.py`: Unreal Editor Python automation for deterministic map generation, FBX import, lighting, camera, and proof-scene setup.
- `tools/asset-pipeline/create_photoreal_kit.py`: Blender Python for source FBX asset generation.
- Unreal C++/Blueprint: appropriate future layer for runtime controls, live SUMO data binding, Pixel Streaming input handling, and packaged simulator behavior.

## Rule going forward

Refer to this as a **traffic simulation renderer**, **digital-twin renderer**, or **operator simulation viewport**, not a game.
