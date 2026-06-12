# SmartIntersection Unreal Renderer

This is the rebuilt **road-only Unreal Engine 5 renderer** for SmartIntersection.

Architecture boundary:

- SUMO truth source owns traffic simulation truth.
- Python TraCI bridge will stream authoritative state later.
- Unreal Engine 5 renders approved static road/intersection environments only.

Milestone scope:

- road geometry
- intersections
- city-specific lane markings
- crosswalks
- bus/bike lanes where reference-supported
- curbs, refuge islands, tactile paving, utility covers, signal placeholders
- asphalt and paint material variation cues

Excluded from this milestone:

- no vehicles
- no pedestrians
- no gameplay
- no UE-side traffic simulation

Approved references are tracked in:

`docs/references/city-road-intersection-image-reference-approval-packet.md`

Generator:

`Content/Python/generate_road_intersection.py`

City profiles:

- `SceneProfiles/cities/seoul.json`
- `SceneProfiles/cities/new_york.json`
- `SceneProfiles/cities/paris.json`
- `SceneProfiles/cities/london.json`

Verification:

```bash
python3 scripts/verify-road-only-ue-renderer.py
npm run unreal:generate-city:dry-run -- -Profile london
```

London is the first proof target because the yellow_box_junction, left-hand orientation, bus-lane, double-yellow-line, and cycle-box cues are visually distinctive.
