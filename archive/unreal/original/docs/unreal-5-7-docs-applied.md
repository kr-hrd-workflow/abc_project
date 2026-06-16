# Unreal Engine 5.7 Documentation Applied

Official Unreal Engine 5.7 documentation pages checked during the complete simulation-renderer pass:

- Unreal Engine 5.7 Documentation root: complete resources for UE 5.
- Programming with C++ in Unreal Engine: used to justify a native runtime module for packaged/runtime simulator behavior.
- Unreal Engine C++ Quick Start: used for module/class file layout and build expectations.
- Scripting the Unreal Editor Using Python: used to keep deterministic map generation and FBX import in Editor Python.
- Pixel Streaming in Unreal Engine: confirms Unreal renders on a host and streams frames/audio to browser clients over WebRTC.
- Post Process Effects: used for PostProcessVolume/camera visual grade workflow.
- Lumen Global Illumination and Reflections: informs renderer-quality direction for dynamic lighting/reflection expectations.
- Nanite Virtualized Geometry: informs future high-detail asset strategy once licensed city assets are available.
- Movie Render Pipeline: marks the future path for final offline cinematic deliverables beyond editor proof screenshots.

## Applied architecture decision

The project is not a game. It is a traffic simulation renderer:

- Editor Python remains for content-production automation.
- C++ runtime module is added for simulation state and future live SUMO/TraCI/Pixel Streaming control.
- Pixel Streaming remains the browser delivery path.
- PostProcess/Fog/SkyAtmosphere remain editor-generated scene polish.
- Nanite/Lumen/Movie Render Queue are documented as next fidelity gates when licensed production assets are introduced.
