# Expanded City Road Image Reference Candidates

Purpose: collect image-based references before deleting/rebuilding `renderer/unreal/SmartIntersection/**`. Maps are geometry-only; images below are for UE road material/marking/signal/curb implementation.

## Acceptance Rule

Accept only images where at least one of these is visible: road surface, lane markings, crosswalks, traffic signals, bus/bike lanes, curb/sidewalk, median/islands, asphalt wear, utility covers. Reject event/crowd/map/building-only images.

---

## Seoul — stronger candidates

### Seoul S1 — Samil-ro bus lane
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Bus_lane_Samil-ro.JPG/1280px-Bus_lane_Samil-ro.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_lane_Samil-ro.JPG
- Use: Seoul bus-only lane color/markings, lane separation, dense downtown road context.

### Seoul S2 — Gangnam-daero C300
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/20150209-20150214%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC300.jpg/1280px-20150209-20150214%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC300.jpg
- Page: https://commons.wikimedia.org/wiki/File:20150209-20150214%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC300.jpg
- Use: representative wide Seoul commercial arterial, multi-lane width, signal/signage density.

### Seoul S3 — Sejongno / Gwanghwamun road axis, 2012
- Image: https://upload.wikimedia.org/wikipedia/commons/5/5f/Sejongno_in_Jongno-gu_2012.jpg
- Page: https://commons.wikimedia.org/wiki/File:Sejongno_in_Jongno-gu_2012.jpg
- Use: accepted replacement for rejected event/crowd photos; civic boulevard road proportions and plaza-side lane configuration.

### Seoul S4 — Gangnam-daero C299
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/20150209-20150214%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD_%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C_%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC299.jpg/1280px-20150209-20150214%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD_%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C_%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC299.jpg
- Page: https://commons.wikimedia.org/wiki/File:20150209-20150214%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD_%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C_%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC299.jpg
- Use: second angle for Gangnam arterial width and urban material.

### Seoul S5 — Dongjak-daero
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/20201002_%EB%8F%99%EC%9E%91%EB%8C%80%EB%A1%9C.jpg/1280px-20201002_%EB%8F%99%EC%9E%91%EB%8C%80%EB%A1%9C.jpg
- Page: https://commons.wikimedia.org/wiki/File:20201002_%EB%8F%99%EC%9E%91%EB%8C%80%EB%A1%9C.jpg
- Use: ordinary Seoul arterial asphalt/lane proportions.

### Seoul S6 — Yeongdeungpo central bus lane 1
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Bus_Lane_Yeongdeungpo_Station_1.JPG/1280px-Bus_Lane_Yeongdeungpo_Station_1.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_Lane_Yeongdeungpo_Station_1.JPG
- Use: median bus corridor, bus platform/island, red/brown bus-lane surface.

### Seoul S7 — Yeongdeungpo central bus lane 2
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Bus_Lane_Yeongdeungpo_Station_2.JPG/1280px-Bus_Lane_Yeongdeungpo_Station_2.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_Lane_Yeongdeungpo_Station_2.JPG
- Use: bus-lane island/stop structure and Seoul bus corridor surface.

### Seoul S8 — Gangnam-daero road, alternate
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gangnam-daero%2C_Seoul.jpg/1280px-Gangnam-daero%2C_Seoul.jpg
- Page: https://commons.wikimedia.org/wiki/File:Gangnam-daero,_Seoul.jpg
- Use: broad Seoul avenue perspective and road-edge composition.

### Seoul S9 — 2012 Sejong-daero before Gwanghwamun
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/2012-05-11_Sejong-daero_before_the_Gwanghwamun.jpg/1280px-2012-05-11_Sejong-daero_before_the_Gwanghwamun.jpg
- Page: https://commons.wikimedia.org/wiki/File:2012-05-11_Sejong-daero_before_the_Gwanghwamun.jpg
- Use: civic boulevard road surface and landmark-axis scale.

### Seoul S10 — Sejongno at night
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Sejongno_at_night_01.JPG/1280px-Sejongno_at_night_01.JPG
- Page: https://commons.wikimedia.org/wiki/File:Sejongno_at_night_01.JPG
- Use: later night material/lighting reference; not primary road geometry.

## Seoul note
The rejected Gwanghwamun event/crowd images must not be used. Use Sejongno/Sejong-daero road-visible images for the civic-boulevard target, and Gangnam/Yeongdeungpo/Samil-ro for road-material and bus-lane detail.

---

## NYC / Paris / London raw expanded sets

Raw machine-collected candidates were saved to:

- `docs/references/expanded-city-road-image-references.json`
- `docs/references/seoul-expanded-road-image-candidates.json`

Next curation pass should manually reject false positives, especially NYC repeated Parade Grounds images and London non-road/bus-interior false positives.
