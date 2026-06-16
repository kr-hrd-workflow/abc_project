# Cinematic Final Unreal Pass Plan

## Goal

Finish the SmartIntersection Unreal renderer as a cinematic CCTV-grade proof, using the existing Blender/FBX asset-backed kit plus Unreal lighting/post-process/weather/camera polish.

## Non-negotiables

- Do not call primitive-only blockout “완벽 실사”.
- Use imported `/Game/PhotorealKit` assets where practical.
- Add cinematic camera and post-process evidence to the actual maps.
- Capture only final proof screenshots per city.
- Run `npm run verify` before final claim.
- Revert UE config noise/tokens before commit.

## Implementation checklist

1. Add/upgrade Blender asset kit for cinematic scene support:
   - wet asphalt patch / puddle decal proxy
   - curb detail / lane marker overlay proxy
   - CCTV film-frame overlay mesh if needed
   - richer vehicle material surfaces where feasible
2. Patch UE generator:
   - import new FBX assets into `/Game/PhotorealKit`
   - set cinematic camera actor with wider telephoto CCTV framing
   - add PostProcessVolume: film grain, vignette, contrast, exposure, bloom, depth-of-field if available
   - add ExponentialHeightFog / SkyAtmosphere / VolumetricCloud if available
   - add wet road sheen, puddle strips, light reflections, headlight pools
   - increase asset-backed placement density without making proof screenshots unreadable
3. Regenerate maps:
   - seoul, new_york, paris, london
   - ensure each map contains `/Game/PhotorealKit` references and cinematic actor labels
4. Capture final screenshots only:
   - `docs/technotes/assets/unreal-cinematic-final-screenshots/unreal-<city>-cinematic-final.png`
5. Verification:
   - map exists and > 500KB
   - final screenshot > 1MB or visually inspected as valid
   - grep strings for `/Game/PhotorealKit` and cinematic labels
   - `npm run verify`
   - no UE `SecurityToken` or secret in diff
   - no UnrealEditor process remains
6. Commit/push.

## Acceptance criteria

- Four city maps regenerated with imported assets and cinematic post-process/fog/camera labels.
- Four final proof screenshots archived.
- Full repo verify passes.
- Commit pushed to `origin/main`.
