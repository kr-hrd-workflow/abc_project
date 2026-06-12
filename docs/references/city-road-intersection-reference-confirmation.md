# City Road / Intersection Reference Confirmation

Approval gate before rebuilding `renderer/unreal/SmartIntersection/**` from scratch. These are visual references only; no copyrighted Google/Street View images are embedded or downloaded. UE build should reproduce observed road-language features, not copy photos.


## Reference Quality Rule

Maps are allowed only for geometry/orientation. UE photoreal road implementation requires approved image references per city. Accept images only when road surface, lane markings, crosswalks, curbs/sidewalks, signals, bus/bike lanes, or material wear are visible. Reject event/crowd photos, maps, building-only photos, vehicle-only photos, and images where the road is obscured.

## Build Direction

- Simulation truth source: SUMO.
- Bridge: Python TraCI bridge streams simulation state later.
- Renderer: Unreal Engine 5.7.
- Current milestone: road/intersection surfaces only, city-specific road language first.
- Do not add vehicles, pedestrians, skyline, landing imagery, or validation proof props in this milestone.

---

## Approved Candidate References — Seoul

### S1 — Yeongdeungpo central bus lane
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Bus_Lane_Yeongdeungpo_Station_1.JPG/1280px-Bus_Lane_Yeongdeungpo_Station_1.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_Lane_Yeongdeungpo_Station_1.JPG
- License: CC BY-SA 4.0 / Author: hyolee2
- Extract into UE: red/brown median bus corridor, central bus platform language, broad Korean urban arterial.

### S2 — Yeongdeungpo median bus stop / lane
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Bus_Lane_Yeongdeungpo_Station_2.JPG/1280px-Bus_Lane_Yeongdeungpo_Station_2.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_Lane_Yeongdeungpo_Station_2.JPG
- License: CC BY-SA 4.0 / Author: hyolee2
- Extract into UE: median island edges, bus-only lane surface, overhead urban signage density.

### S3 — Samil-ro bus lane
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Bus_lane_Samil-ro.JPG/1280px-Bus_lane_Samil-ro.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_lane_Samil-ro.JPG
- License: CC BY-SA 3.0 / Author: hyolee2
- Extract into UE: bus-only lane marking, lane separation, Seoul curb/sidewalk relationship.

### S4 — Noryangjin-ro intersection
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Intersection_of_Deungyong-ro_and_Noryangjin-ro_20240501152555.jpg/1280px-Intersection_of_Deungyong-ro_and_Noryangjin-ro_20240501152555.jpg
- Page: https://commons.wikimedia.org/wiki/File:Intersection_of_Deungyong-ro_and_Noryangjin-ro_20240501152555.jpg
- License: CC BY-SA 4.0 / Author: TurnOnTheNight
- Extract into UE: broad stop lines, Korean signal placement, real Seoul intersection scale.

### S5 — Uisadang-daero / Yeouinaru-ro intersection
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Intersection_of_Uisadang-daero_and_Yeouinaru-ro_20240501162002.jpg/1280px-Intersection_of_Uisadang-daero_and_Yeouinaru-ro_20240501162002.jpg
- Page: https://commons.wikimedia.org/wiki/File:Intersection_of_Uisadang-daero_and_Yeouinaru-ro_20240501162002.jpg
- License: CC BY-SA 4.0 / Author: TurnOnTheNight
- Extract into UE: wide road proportions, arterial island/curb geometry, crosswalk scale.



## Seoul Landmark / Representative Intersections to Add

Important correction: the earlier Gwanghwamun candlelight-vigil photos are **rejected** as road references. They show a famous place, but the road surface, lane geometry, crosswalk rhythm, and signal layout are obscured by event crowds. They must not be used as UE road-building references.

### SL1 — Gwanghwamun / Sejong-daero / Sejong-ro intersection
- Status: landmark target, **map/street-view reference only** until a clean road-surface image is approved.
- Why: Seoul's representative civic boulevard axis; very wide arterial, landmark plaza context, strong signal/crosswalk rhythm.
- Implement only after checking map/street-view road geometry: wide multi-lane approach, large zebra crosswalks, overhead mast-arm signals, central median/plaza edge, dense lane arrows.
- Map reference: https://www.google.com/maps/search/Gwanghwamun+Sejong-daero+intersection+Seoul
- Do not use rejected event/crowd photos for road proportions.

### SL2 — Gangnam Station / Gangnam-daero intersection and corridor
- Status: strongest free-image Seoul landmark/corridor reference found so far.
- Why: iconic Seoul commercial arterial; dense lanes, bus traffic, signal/signage density, high-value road material reference.
- Implement: wide Seoul avenue, bus-lane elements, repeated lane arrows, curbside bus-stop/sign structures, worn asphalt and dense markings.
- Map reference: https://www.google.com/maps/search/Gangnam+Station+intersection+Gangnam-daero+Seoul
- Image candidate A: https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9C_Gangnam-daero_%E6%B1%9F%E5%8D%97%E3%82%A2%E3%83%99%E3%83%8B%E3%83%A5%E3%83%BC_-_panoramio.jpg/1280px-%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9C_Gangnam-daero_%E6%B1%9F%E5%8D%97%E3%82%A2%E3%83%99%E3%83%8B%E3%83%A5%E3%83%BC_-_panoramio.jpg
- Page A: https://commons.wikimedia.org/wiki/File:%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9C_Gangnam-daero_%E6%B1%9F%E5%8D%97%E3%82%A2%E3%83%99%E3%83%8B%E3%83%A5%E3%83%BC_-_panoramio.jpg
- Image candidate B: https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Bongeunsa-ro_Street4.jpg/1280px-Bongeunsa-ro_Street4.jpg
- Page B: https://commons.wikimedia.org/wiki/File:Bongeunsa-ro_Street4.jpg
- Image candidate C: https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gangnam-daero%2C_Seoul.jpg/1280px-Gangnam-daero%2C_Seoul.jpg
- Page C: https://commons.wikimedia.org/wiki/File:Gangnam-daero,_Seoul.jpg

### SL3 — Sungnyemun / Seoul Station / Sejong-daero approach
- Status: useful central-Seoul road/landmark reference.
- Why: central traffic node with old/new Seoul context, multi-lane road surfaces and transit-heavy approaches.
- Implement: multi-leg road geometry, bus/taxi lane cues, heavy stop lines, urban curb islands.
- Map reference: https://www.google.com/maps/search/Seoul+Station+Sungnyemun+intersection
- Image candidate: https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Sungnyemun_seen_from_across_the_road.jpg/1280px-Sungnyemun_seen_from_across_the_road.jpg
- Page: https://commons.wikimedia.org/wiki/File:Sungnyemun_seen_from_across_the_road.jpg

### SL4 — Seoul City Hall / Seoul Plaza intersection
- Status: landmark map/street-view reference; still needs clean road-photo approval.
- Why: central Seoul civic traffic environment, broad crosswalks, plaza/road boundary, signal density.
- Implement: plaza-side curb, wide asphalt field, crosswalk-heavy intersection, overhead signal arms, stop bars/lane arrows.
- Map reference: https://www.google.com/maps/search/Seoul+City+Hall+intersection+Seoul+Plaza

### SL5 — Jamsil Station / Lotte World Tower intersection
- Status: landmark map/street-view reference; still needs clean road-photo approval.
- Why: large east-Seoul arterial node with landmark-scale road width.
- Implement: broad lanes, wide pedestrian crossings, median/refuge elements, dense directional signage.
- Map reference: https://www.google.com/maps/search/Jamsil+Station+intersection+Seoul

### SL6 — Seoul National University Station / Gwanak-ro intersection
- Status: usable clean road/intersection photo, less landmark-iconic but good for road geometry.
- Image: https://upload.wikimedia.org/wikipedia/commons/6/68/Seoul_National_University_Station_Intersection_and_Bongcheon-ro_Intersection_and_Gwanak-ro.jpg
- Page: https://commons.wikimedia.org/wiki/File:Seoul_National_University_Station_Intersection_and_Bongcheon-ro_Intersection_and_Gwanak-ro.jpg
- Implement: visible intersection surface, Korean road proportions, lane/signal layout.

### Seoul landmark implementation decision

For the first Seoul UE road-only proof, do **not** use the rejected Gwanghwamun crowd photos. Use this hierarchy:

1. Geometry target: Gwanghwamun/Sejong-daero via map/street-view only if approved.
2. Strong free-image road/corridor reference: Gangnam-daero.
3. Bus-lane material/details: Yeongdeungpo and Samil-ro references.
4. Central landmark road context: Sungnyemun/Seoul Station approach.

If the user wants famous-place accuracy over immediately available free images, collect explicit Street View screenshots/links for Gwanghwamun, City Hall, Jamsil, and Gangnam before UE generation.

### Seoul implementation commitments
- Wide arterial intersection.
- Red median bus corridor.
- Korean `버스전용` and `BUS ONLY` markings.
- Broad zebra crosswalks, thick stop lines.
- Yellow tactile paving and concrete/stone curb islands.
- Overhead mast-arm signal placeholders.

---

## Approved Candidate References — New York

### NY1 — 8th Avenue / 33rd Street
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/8_Av_33_St_intersection_vc.jpg/1280px-8_Av_33_St_intersection_vc.jpg
- Page: https://commons.wikimedia.org/wiki/File:8_Av_33_St_intersection_vc.jpg
- License: CC BY 2.0 / Author: Alex
- Extract into UE: Manhattan lane density, continental crosswalks, patched asphalt, grid geometry.

### NY2 — 14th / 9th / Hudson plaza intersection
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/14th_St_9th_Av_Hudson_St_td_%282022-02-09%29_22.jpg/1280px-14th_St_9th_Av_Hudson_St_td_%282022-02-09%29_22.jpg
- Page: https://commons.wikimedia.org/wiki/File:14th_St_9th_Av_Hudson_St_td_(2022-02-09)_22.jpg
- License: CC BY-SA 4.0 / Author: Tdorante10
- Extract into UE: pedestrian plaza-adjacent crosswalk geometry, NYC surface/paving contrast.

### NY3 — 2nd Avenue / East 116th Street
- Image: https://upload.wikimedia.org/wikipedia/commons/e/ee/2nd_Avenue_and_East_116th_Street.jpg
- Page: https://commons.wikimedia.org/wiki/File:2nd_Avenue_and_East_116th_Street.jpg
- License: CC BY-SA 4.0 / Author: PrecipiceofDuck
- Extract into UE: ordinary Manhattan intersection scale, traffic signal/crosswalk layout.

### NY4 — 5th Avenue at 48th Street
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/5th_Av_Oct_2020_54.jpg/1280px-5th_Av_Oct_2020_54.jpg
- Page: https://commons.wikimedia.org/wiki/File:5th_Av_Oct_2020_54.jpg
- License: CC BY-SA 4.0 / Author: Epicgenius
- Extract into UE: Midtown curb/sidewalk relation, dense markings, road wear.

### NY5 — 42nd Street Midtown
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/42nd_Street%2C_Midtown_Manhattan%2C_New_York_%287237737958%29.jpg/1280px-42nd_Street%2C_Midtown_Manhattan%2C_New_York_%287237737958%29.jpg
- Page: https://commons.wikimedia.org/wiki/File:42nd_Street,_Midtown_Manhattan,_New_York_(7237737958).jpg
- License: CC BY-SA 2.0 / Author: Ken Lund
- Extract into UE: broad Midtown street surface, urban signal/streetlight density.

### NYC implementation commitments
- Continental/ladder crosswalks.
- Thick stop bars and white `ONLY` turn markings.
- Red `BUS ONLY` lane and green bike-lane conflict zone from official NYC design guidance even where not visible in every Commons photo.
- Patched asphalt, manholes, tar seams, utility cuts.
- Yellow signal-head placeholders.

---

## Approved Candidate References — Paris

### P1 — Paris bus lane on Boulevard Vincent-Auriol
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Bus_27_on_buslane.JPG/1280px-Bus_27_on_buslane.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_27_on_buslane.JPG
- License: CC BY-SA 3.0 / Author: Smiley.toerist
- Extract into UE: center/side reserved bus lane, Paris boulevard markings.

### P2 — Boulevard Sébastopol
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Boulevard-sebastopol.jpg/1280px-Boulevard-sebastopol.jpg
- Page: https://commons.wikimedia.org/wiki/File:Boulevard-sebastopol.jpg
- License: CC BY-SA 3.0 / Author: Thierry Bezecourt
- Extract into UE: Paris boulevard width, urban lane composition, curbside density.

### P3 — Boulevard du Montparnasse 1
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Boulevard_du_Montparnasse_1%2C_Paris_24_August_2013.jpg/1280px-Boulevard_du_Montparnasse_1%2C_Paris_24_August_2013.jpg
- Page: https://commons.wikimedia.org/wiki/File:Boulevard_du_Montparnasse_1,_Paris_24_August_2013.jpg
- License: CC BY 2.0 / Author: flightlog
- Extract into UE: tree-lined Paris road material, stone sidewalk/curb relationship.

### P4 — Paris shared bike/bus/taxi lane
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Paris_Shared_Bike%2C_Bus_and_Taxi_Lane.jpg/1280px-Paris_Shared_Bike%2C_Bus_and_Taxi_Lane.jpg
- Page: https://commons.wikimedia.org/wiki/File:Paris_Shared_Bike,_Bus_and_Taxi_Lane.jpg
- License: CC BY 2.0 / Author: EURIST e.V.
- Extract into UE: shared bus/bike/taxi lane surface, lane text, curbside separator logic.

### P5 — Protected bicycle lane, Paris
- Image: https://upload.wikimedia.org/wikipedia/commons/e/ee/Protected_Bicycle_Lane%2C_Paris_I.jpg
- Page: https://commons.wikimedia.org/wiki/File:Protected_Bicycle_Lane,_Paris_I.jpg
- License: Public domain / Author: Ingolfson
- Extract into UE: curb-separated cycle lane and compact European lane geometry.

### Paris implementation commitments
- Compact European curb radii.
- Zebra crosswalks and white lane arrows.
- Bike `sas vélo`/advanced stop box.
- BUS/shared lane text.
- Stone/granite curb islands and slim curbside signal placeholders.

---

## Approved Candidate References — London

### L1 — Yellow box junction, Cromwell Road
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Yellow_box_junction%2C_Cromwell_Road_-_geograph.org.uk_-_5203376.jpg/1280px-Yellow_box_junction%2C_Cromwell_Road_-_geograph.org.uk_-_5203376.jpg
- Page: https://commons.wikimedia.org/wiki/File:Yellow_box_junction,_Cromwell_Road_-_geograph.org.uk_-_5203376.jpg
- License: CC BY-SA 2.0 / Author: Richard Sutcliffe
- Extract into UE: yellow box junction grid, London/UK junction marking priority.

### L2 — Yellow box junction generic UK reference
- Image: https://upload.wikimedia.org/wikipedia/commons/e/e6/Yellow_box_junction_-_geograph.org.uk_-_7843165.jpg
- Page: https://commons.wikimedia.org/wiki/File:Yellow_box_junction_-_geograph.org.uk_-_7843165.jpg
- License: CC BY-SA 2.0 / Author: Graham Hogg
- Extract into UE: yellow criss-cross junction geometry and worn paint edges.

### L3 — Tottenham bus garage entrance yellow box
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Tottenham_Bus_Garage_Entrance.jpg/1280px-Tottenham_Bus_Garage_Entrance.jpg
- Page: https://commons.wikimedia.org/wiki/File:Tottenham_Bus_Garage_Entrance.jpg
- License: CC BY-SA 2.0 / Author: Alan Stanton
- Extract into UE: bus corridor/garage-adjacent yellow box, red-route/bus operational feel.

### L4 — West End Lane / Finchley Road junction
- Image: https://upload.wikimedia.org/wikipedia/commons/b/b5/West_End_Lane_junction_with_Finchley_Road%2C_Hampstead_-_geograph.org.uk_-_40287.jpg
- Page: https://commons.wikimedia.org/wiki/File:West_End_Lane_junction_with_Finchley_Road,_Hampstead_-_geograph.org.uk_-_40287.jpg
- License: CC BY-SA 2.0 / Author: David Hawgood
- Extract into UE: London curbside red route/yellow line details, narrow junction feel.

### L5 — Official road-marking references
- TfL Streetscape Guidance: https://content.tfl.gov.uk/streetscape-guidance-.pdf
- UK Traffic Signs Manual Chapter 5: https://www.gov.uk/government/publications/traffic-signs-manual-chapter-5-road-markings
- Extract into UE: `LOOK LEFT`, `LOOK RIGHT`, double yellow curb lines, stop lines, tactile paving, cycle boxes.

### London implementation commitments
- Left-hand traffic orientation.
- Yellow box junction at center.
- Red bus lane/route treatment.
- Double yellow curb lines.
- `LOOK LEFT`, `LOOK RIGHT`, `BUS LANE`, `KEEP CLEAR` road text.
- UK black signal-head placeholders, refuge island, keep-left bollard.

---

## Approval Decision Needed

Recommended path:

1. Approve these references as the first road-only source set.
2. Reset only `renderer/unreal/SmartIntersection/**`.
3. Generate London first as proof because its road markings are the most distinctive.
4. After London visual proof passes, generate Seoul/New York/Paris using the same road-only generator architecture.

If rejected, replace city-specific reference set before any UE deletion.
