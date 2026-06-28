# ControlNet Structure-Preserving Photoreal Pipeline (강남역)

Goal: turn our **metric R3F scene render** (roads/lanes/vehicles/buildings, already aligned) into a
**photorealistic** frame while PRESERVING the structure (vehicles stay on lanes) — using ComfyUI +
ControlNet on the user's Windows GPU. R3F provides the metric structure; SD+ControlNet provides the realism.

Pipeline: `metric scene render (structure) → ComfyUI [depth+canny ControlNet + img2img] → photoreal frame`.

## 1. Install in ComfyUI (Windows desktop app)

Put model files in the ComfyUI **models** folder (Desktop app: Settings → shows the models path; subfolders below):

**Checkpoint (photoreal SDXL)** → `models/checkpoints/`
- `RealVisXL V5.0` (recommended, very photoreal) — HuggingFace `SG161222/RealVisXL_V5.0` or Civitai. (Alt: `Juggernaut XL`.)

**ControlNet (SDXL)** → `models/controlnet/`
- `xinsir/controlnet-depth-sdxl-1.0` (depth)  — HuggingFace.
- `xinsir/controlnet-canny-sdxl-1.0` (canny) — HuggingFace.
- (Alternative single model: `xinsir/controlnet-union-sdxl-1.0` promax — needs the "SetUnionControlNetType" node.)

**Custom nodes** (ComfyUI Manager → Install):
- `comfyui_controlnet_aux` — provides the **DepthAnything** + **Canny** preprocessors.

VRAM-light alternative (SD1.5): checkpoint `Realistic Vision V6`; ControlNet `control_v11f1p_sd15_depth` + `control_v11p_sd15_canny`.

## 2. Structure source image
`artifacts/controlnet-source/structure-wide-day.png` (and `-night.png`), 1536×1024 — the metric scene at the
operator-wide camera. Copy into ComfyUI's `input/` folder (or drag into a LoadImage node).
(More viewpoints/sequences can be exported once the single-frame pipeline is proven.)

## 3. Workflow (node recipe — SDXL img2img + depth + canny)
1. **Load Checkpoint** (RealVisXL) → MODEL, CLIP, VAE.
2. **Load Image** (structure-wide-day.png) → IMAGE.
3. **VAE Encode** (IMAGE, VAE) → LATENT  *(img2img base — preserves layout)*.
4. Preprocessors (comfyui_controlnet_aux):
   - **DepthAnything Preprocessor** (IMAGE) → DEPTH.
   - **Canny Edge** (IMAGE, low 100 / high 200) → CANNY.
5. **Load ControlNet** (depth) and **Load ControlNet** (canny).
6. **CLIP Text Encode** ×2 — positive + negative (prompts in §4).
7. **Apply ControlNet (Advanced)** chained:
   - depth: positive/negative + depth control_net + DEPTH image, **strength 0.65**, start 0.0 end 0.8.
   - then canny: + canny control_net + CANNY image, **strength 0.45**, start 0.0 end 0.7.
8. **KSampler**: model + (post-controlnet) positive/negative + LATENT (from VAE Encode), **denoise 0.55–0.65**
   (lower = more faithful to layout), steps 30, cfg 6.0, sampler `dpmpp_2m`, scheduler `karras`.
9. **VAE Decode** → **Save Image**.

Key knobs: ControlNet strengths + KSampler `denoise` control the structure-vs-realism balance. If vehicles/lanes
drift, raise ControlNet strength / lower denoise; if it stays too "3D/CG", raise denoise slightly.

## 4. Prompts
**Positive (day):** `photorealistic aerial photo of Gangnam Station intersection Seoul, real glass skyscrapers, real cars and buses on the road, asphalt with lane markings, daylight, sharp, high detail, photo, 50mm`
**Positive (night):** `photorealistic night aerial photo of Gangnam intersection Seoul, glass towers with lit windows, LED billboards, car headlights and taillights, wet asphalt reflections, neon, photo`
**Negative:** `cartoon, 3d render, cgi, toy, lowpoly, video game, illustration, blurry, deformed, plastic, oversaturated`

## 5. Run + iterate
Run on one structure image → review. If the layout (vehicles on lanes, road, building positions) is preserved
AND it looks photoreal, the approach is proven; then we scale: export more viewpoints (cctv) + day/night +
sequences, and decide how the photoreal frames feed the dashboard (per-scenario stills, a rendered sequence, or
periodic re-gen). Send the output back for review.
