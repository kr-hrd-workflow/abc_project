# City Road / Intersection Image Reference Approval Packet

Curated for the SmartIntersection UE5 road-only renderer reference gate. This packet is intentionally image/reference focused and does **not** authorize UE implementation, deletion, or rebuild work. It should be approved by the user before any destructive reset of `renderer/unreal/SmartIntersection/**`.

## Scope and quality gate

- Cities: Seoul, New York, Paris, London.
- Use references only for road/intersection language: asphalt, lane markings, stop lines, crosswalks, signals, bus/bike lanes, curbs, tactile paving, medians, bollards, drainage/utility covers, patches, staining, and paint wear.
- Do **not** use images that are crowd/event/protest dominated, map-only, aerial-only, building-only, vehicle-only, or road-obscured.
- No images are embedded or downloaded here; URLs are provided for visual review and attribution.
- Status meaning:
  - `approved`: curator-approved candidate for user approval; usable for UE road extraction if the user approves this packet.
  - `pending`: potentially useful but needs visual/license/fit confirmation before use.
  - `rejected`: do not use for UE road rendering.

## Recommended first-pass approval set

- Seoul: approve S-01 through S-10.
- New York: approve NY-01 through NY-08; NY-09/NY-10 remain pending for bike/bus-lane supplemental review.
- Paris: approve P-01 through P-09; P-10 remains pending as official/design-guidance supplemental material.
- London: approve L-01 through L-09; L-10 remains pending as official/design-guidance supplemental material.

---

## Seoul

### Seoul accepted / approval-ready

#### S-01 — Samil-ro bus lane
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Bus_lane_Samil-ro.JPG/1280px-Bus_lane_Samil-ro.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_lane_Samil-ro.JPG
- License/source note: CC BY-SA 3.0 / hyolee2 / Wikimedia Commons.
- Why usable: road-visible Seoul bus-only lane with lane separation and downtown curb/sidewalk context.
- UE extraction notes: red/brown bus-lane treatment, `버스전용`/BUS lane logic, white lane separators, dense pole/sign context, worn asphalt variation.

#### S-02 — Gangnam-daero commercial arterial C300
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/20150209-20150214%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC300.jpg/1280px-20150209-20150214%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC300.jpg
- Page: https://commons.wikimedia.org/wiki/File:20150209-20150214%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC300.jpg
- License/source note: CC BY-SA 4.0 / 최광모 / Wikimedia Commons.
- Why usable: representative broad Seoul arterial with multi-lane proportions and strong urban road identity.
- UE extraction notes: wide arterial cross-section, Korean lane density, signal/signage clutter, commercial-corridor asphalt and paint wear.

#### S-03 — Sejongno / Sejong-daero civic road axis
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/5/5f/Sejongno_in_Jongno-gu_2012.jpg
- Page: https://commons.wikimedia.org/wiki/File:Sejongno_in_Jongno-gu_2012.jpg
- License/source note: CC BY-SA 3.0 / Michaela den / Wikimedia Commons.
- Why usable: road-visible replacement for rejected Gwanghwamun event/crowd photos; shows civic boulevard scale.
- UE extraction notes: very wide Seoul arterial, central plaza/median edge, broad approach lanes, civic-axis road proportions without relying on landmark geometry.

#### S-04 — Gangnam-daero commercial arterial C299
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/20150209-20150214%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD_%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C_%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC299.jpg/1280px-20150209-20150214%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD_%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C_%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC299.jpg
- Page: https://commons.wikimedia.org/wiki/File:20150209-20150214%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD_%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C_%EA%B0%95%EB%82%A8%EB%8C%80%EB%A1%9CC299.jpg
- License/source note: CC BY-SA 4.0 / 최광모 / Wikimedia Commons.
- Why usable: second angle for Gangnam-daero, road width, markings, and urban lighting/material cues.
- UE extraction notes: broad avenue lane rhythm, glossy/worn dark asphalt, long-lane perspective, high-density urban poles and signs.

#### S-05 — Dongjak-daero arterial
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/20201002_%EB%8F%99%EC%9E%91%EB%8C%80%EB%A1%9C.jpg/1280px-20201002_%EB%8F%99%EC%9E%91%EB%8C%80%EB%A1%9C.jpg
- Page: https://commons.wikimedia.org/wiki/File:20201002_%EB%8F%99%EC%9E%91%EB%8C%80%EB%A1%9C.jpg
- License/source note: CC BY-SA 3.0 / Striker9498 / Wikimedia Commons.
- Why usable: ordinary Seoul arterial with visible bus-lane/corridor and lane proportions.
- UE extraction notes: median/curb relationship, arterial asphalt, white/yellow markings, bus corridor placement.

#### S-06 — Yeongdeungpo central bus lane 1
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Bus_Lane_Yeongdeungpo_Station_1.JPG/1280px-Bus_Lane_Yeongdeungpo_Station_1.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_Lane_Yeongdeungpo_Station_1.JPG
- License/source note: CC BY-SA 4.0 / hyolee2 / Wikimedia Commons.
- Why usable: strong median bus corridor and central bus platform reference.
- UE extraction notes: red/brown median bus corridor, bus island/platform edges, protected median feel, bus-only lane material.

#### S-07 — Yeongdeungpo central bus lane 2
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Bus_Lane_Yeongdeungpo_Station_2.JPG/1280px-Bus_Lane_Yeongdeungpo_Station_2.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_Lane_Yeongdeungpo_Station_2.JPG
- License/source note: CC BY-SA 4.0 / hyolee2 / Wikimedia Commons.
- Why usable: complements S-06 with clearer stop/island and lane-surface details.
- UE extraction notes: bus-stop island geometry, lane edge protection, median curb height, Korean bus-lane surface color.

#### S-08 — Gangnam-daero alternate daytime road view
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gangnam-daero%2C_Seoul.jpg/1280px-Gangnam-daero%2C_Seoul.jpg
- Page: https://commons.wikimedia.org/wiki/File:Gangnam-daero,_Seoul.jpg
- License/source note: CC BY-SA 4.0 / Christophe95 / Wikimedia Commons.
- Why usable: wide Seoul avenue perspective and curbside composition are visible.
- UE extraction notes: lane count, curbside sidewalk scale, road-edge furniture, broad asphalt field.

#### S-09 — Sejong-daero before Gwanghwamun
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/2012-05-11_Sejong-daero_before_the_Gwanghwamun.jpg/1280px-2012-05-11_Sejong-daero_before_the_Gwanghwamun.jpg
- Page: https://commons.wikimedia.org/wiki/File:2012-05-11_Sejong-daero_before_the_Gwanghwamun.jpg
- License/source note: CC BY-SA 2.0 / Mario Sánchez Prada / Wikimedia Commons.
- Why usable: civic boulevard road surface and landmark-axis scale are visible without event crowd obstruction.
- UE extraction notes: broad road width, median/plaza adjacency, lane directions, dense bus/taxi arterial markings.

#### S-10 — Seoul National University Station / Gwanak-ro intersection
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/6/68/Seoul_National_University_Station_Intersection_and_Bongcheon-ro_Intersection_and_Gwanak-ro.jpg
- Page: https://commons.wikimedia.org/wiki/File:Seoul_National_University_Station_Intersection_and_Bongcheon-ro_Intersection_and_Gwanak-ro.jpg
- License/source note: Wikimedia Commons; license to confirm on page before asset attribution.
- Why usable: road/intersection surface and Korean signal/lane layout are visible.
- UE extraction notes: real Seoul intersection scale, crosswalk/stop-line rhythm, overhead signal placement, lane arrows.

### Seoul rejected / do not use

- Gwanghwamun / Seoul City Hall / Sejong-daero event or street-cheering crowd photos, including 2002 FIFA cheering images: `rejected` because road surface and markings are obscured by crowds/events.
- Historic 1950s/1970s Sejong-daero tram/aerial photos: `rejected` for current UE road rendering because they are historic/aerial and do not represent present road markings/materials.
- Vehicle-only Gangnam bus photos: `rejected` unless enough road marking is visible; do not use as primary references.
- Night-only skyline/traffic-light blur images: `pending` or `rejected` unless road surface/marking detail is clear.

---

## New York

### New York accepted / approval-ready

#### NY-01 — 8th Avenue / 33rd Street, Manhattan
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/8_Av_33_St_intersection_vc.jpg/1280px-8_Av_33_St_intersection_vc.jpg
- Page: https://commons.wikimedia.org/wiki/File:8_Av_33_St_intersection_vc.jpg
- License/source note: CC BY 2.0 / Alex / Wikimedia Commons.
- Why usable: clear Manhattan grid intersection with road markings, crosswalks, signal/street furniture, and asphalt wear.
- UE extraction notes: continental/ladder crosswalks, thick stop bars, patched asphalt, manhole/utility details, Manhattan lane proportions.

#### NY-02 — 14th Street / 9th Avenue / Hudson Street
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/14th_St_9th_Av_Hudson_St_td_%282022-02-09%29_22.jpg/1280px-14th_St_9th_Av_Hudson_St_td_%282022-02-09%29_22.jpg
- Page: https://commons.wikimedia.org/wiki/File:14th_St_9th_Av_Hudson_St_td_(2022-02-09)_22.jpg
- License/source note: CC BY-SA 4.0 / Tdorante10 / Wikimedia Commons.
- Why usable: pedestrian-plaza-adjacent intersection with visible road/crosswalk geometry.
- UE extraction notes: NYC curb extensions/plaza edge, crosswalk alignment, concrete sidewalk slabs, asphalt/paver material contrast.

#### NY-03 — 2nd Avenue / East 116th Street
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/e/ee/2nd_Avenue_and_East_116th_Street.jpg
- Page: https://commons.wikimedia.org/wiki/File:2nd_Avenue_and_East_116th_Street.jpg
- License/source note: CC BY-SA 4.0 / PrecipiceofDuck / Wikimedia Commons.
- Why usable: ordinary Manhattan intersection with visible traffic signals and crosswalks.
- UE extraction notes: ladder/continental crosswalk, yellow signal heads, stop bars, curb/sidewalk relationship, road surface patches.

#### NY-04 — 5th Avenue at 48th Street
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/5th_Av_Oct_2020_54.jpg/1280px-5th_Av_Oct_2020_54.jpg
- Page: https://commons.wikimedia.org/wiki/File:5th_Av_Oct_2020_54.jpg
- License/source note: CC BY-SA 4.0 / Epicgenius / Wikimedia Commons.
- Why usable: Midtown curb/sidewalk relation and lane/marking density are visible.
- UE extraction notes: concrete slab sidewalks, dense poles/signals, urban curb edge, stop/turn marking placement.

#### NY-05 — 42nd Street, Midtown Manhattan
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/42nd_Street%2C_Midtown_Manhattan%2C_New_York_%287237737958%29.jpg/1280px-42nd_Street%2C_Midtown_Manhattan%2C_New_York_%287237737958%29.jpg
- Page: https://commons.wikimedia.org/wiki/File:42nd_Street,_Midtown_Manhattan,_New_York_(7237737958).jpg
- License/source note: CC BY-SA 2.0 / Ken Lund / Wikimedia Commons.
- Why usable: broad Midtown street surface and signal/streetlight density are visible.
- UE extraction notes: avenue-scale asphalt, lane rhythm, curbside poles, manholes/utility covers, worn paint.

#### NY-06 — Broadway / 5th Avenue / 24th Street
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Bway_5_Av_24_St_Jun_2017_02.jpg/1280px-Bway_5_Av_24_St_Jun_2017_02.jpg
- Page: https://commons.wikimedia.org/wiki/File:Bway_5_Av_24_St_Jun_2017_02.jpg
- License/source note: CC BY-SA 4.0 / Epicgenius / Wikimedia Commons.
- Why usable: Flatiron-area multi-leg intersection with crosswalks and signal context.
- UE extraction notes: angled Manhattan junction geometry, crosswalk striping, traffic-light placement, road/sidewalk material split.

#### NY-07 — Grant Avenue / Pitkin Avenue, Brooklyn
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Grant_Av_Pitkin_Av_td_07_-_IND_Subway_via_Pitkin_Av.jpg/1280px-Grant_Av_Pitkin_Av_td_07_-_IND_Subway_via_Pitkin_Av.jpg
- Page: https://commons.wikimedia.org/wiki/File:Grant_Av_Pitkin_Av_td_07_-_IND_Subway_via_Pitkin_Av.jpg
- License/source note: CC BY-SA 4.0 / Tdorante10 / Wikimedia Commons.
- Why usable: clear NYC neighborhood intersection with road surface, signals, crosswalks, and curb geometry.
- UE extraction notes: worn crosswalk paint, patched asphalt, signal mast/pole placement, curb ramps.

#### NY-08 — Jackson Avenue / 11th Street / 48th Avenue, Long Island City
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Jackson_Av_11th_St_48th_Av_td_%282019-04-11%29_14.jpg/1280px-Jackson_Av_11th_St_48th_Av_td_%282019-04-11%29_14.jpg
- Page: https://commons.wikimedia.org/wiki/File:Jackson_Av_11th_St_48th_Av_td_(2019-04-11)_14.jpg
- License/source note: CC BY-SA 4.0 / Tdorante10 / Wikimedia Commons.
- Why usable: good view of crosswalk, median/curb edge, and signalized urban intersection.
- UE extraction notes: concrete curb geometry, crosswalk edge wear, non-Manhattan but NYC-consistent signals and lane markings.

### New York pending / supplemental

#### NY-09 — 8th Avenue protected bike lane 2
- Status: `pending`
- Image: https://live.staticflickr.com/7085/7345782400_4046f67879_b.jpg
- Page: https://www.flickr.com/photos/7995989@N03/7345782400
- License/source note: Openverse/Flickr record indicates BY-NC; attribution and reuse constraints need confirmation.
- Why pending: useful protected-bike-lane reference, but non-commercial license and image fit should be checked before use.
- UE extraction notes if approved: green/protected bike-lane conflict zones, lane buffer, bollard/protection rhythm.

#### NY-10 — NYC bicycle signal / protected lane context
- Status: `pending`
- Image: https://live.staticflickr.com/2408/2366546287_9c49509b5e_b.jpg
- Page: https://www.flickr.com/photos/19243288@N00/2366546287
- License/source note: Openverse/Flickr record indicates BY-NC-SA; attribution and non-commercial constraints need confirmation.
- Why pending: useful for bike signal/infrastructure details but not primary road-surface reference.
- UE extraction notes if approved: bike signal head placeholder, protected lane edge details.

### New York rejected / do not use

- Stretch limousine in NYC: `rejected` as vehicle-primary despite road/crosswalk tags.
- Times Square crowd/tourist photos and billboard-dominated images: `rejected` unless road markings are unobstructed; avoid landmark crutches.
- Atlantic City / non-NYC false positives: `rejected` because city identity is wrong.
- Building-only NYPL/Saks/landmark views: `rejected` unless road/intersection markings dominate.
- Experimental bike-lane diagrams/drawings: `rejected` as design concepts, not photo road references.

---

## Paris

### Paris accepted / approval-ready

#### P-01 — Boulevard Vincent-Auriol bus lane
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Bus_27_on_buslane.JPG/1280px-Bus_27_on_buslane.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_27_on_buslane.JPG
- License/source note: CC BY-SA 3.0 / Smiley.toerist / Wikimedia Commons.
- Why usable: Paris boulevard bus-lane reference with visible road markings and lane allocation.
- UE extraction notes: reserved bus lane, compact European boulevard lanes, French road paint scale, curbside signal/sign density.

#### P-02 — Boulevard Sébastopol
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Boulevard-sebastopol.jpg/1280px-Boulevard-sebastopol.jpg
- Page: https://commons.wikimedia.org/wiki/File:Boulevard-sebastopol.jpg
- License/source note: CC BY-SA 3.0 / Thierry Bezecourt / Wikimedia Commons.
- Why usable: Paris boulevard width, curbside density, and road composition visible.
- UE extraction notes: boulevard geometry, stone/curb edges, lane rhythm, compact signal/pole placement.

#### P-03 — Boulevard du Montparnasse 1
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Boulevard_du_Montparnasse_1%2C_Paris_24_August_2013.jpg/1280px-Boulevard_du_Montparnasse_1%2C_Paris_24_August_2013.jpg
- Page: https://commons.wikimedia.org/wiki/File:Boulevard_du_Montparnasse_1,_Paris_24_August_2013.jpg
- License/source note: CC BY 2.0 / flightlog / Wikimedia Commons.
- Why usable: tree-lined Paris boulevard road material and sidewalk/curb relationship are visible.
- UE extraction notes: worn dark asphalt, stone curb, boulevard lane proportions, European urban roadside objects.

#### P-04 — Boulevard du Montparnasse 2
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Boulevard_du_Montparnasse_2%2C_Paris_24_August_2013.jpg/1280px-Boulevard_du_Montparnasse_2%2C_Paris_24_August_2013.jpg
- Page: https://commons.wikimedia.org/wiki/File:Boulevard_du_Montparnasse_2,_Paris_24_August_2013.jpg
- License/source note: CC BY 2.0 / flightlog / Wikimedia Commons.
- Why usable: road markings, zebra crossing, bus-lane tags/context, and Paris boulevard surface visible.
- UE extraction notes: zebra crossings, bus-lane placement, worn asphalt and paint, curbside trees/signals.

#### P-05 — Paris shared bike/bus/taxi lane
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Paris_Shared_Bike%2C_Bus_and_Taxi_Lane.jpg/1280px-Paris_Shared_Bike%2C_Bus_and_Taxi_Lane.jpg
- Page: https://commons.wikimedia.org/wiki/File:Paris_Shared_Bike,_Bus_and_Taxi_Lane.jpg
- License/source note: CC BY 2.0 / EURIST e.V. / Wikimedia Commons.
- Why usable: close road-language reference for shared bus/bike/taxi lanes.
- UE extraction notes: `BUS`/bike/taxi shared lane text, lane separator treatment, curbside lane scale.

#### P-06 — Protected Bicycle Lane, Paris I
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/e/ee/Protected_Bicycle_Lane%2C_Paris_I.jpg
- Page: https://commons.wikimedia.org/wiki/File:Protected_Bicycle_Lane,_Paris_I.jpg
- License/source note: Public domain / Ingolfson / Wikimedia Commons.
- Why usable: curb-separated cycle-lane and compact street geometry are visible.
- UE extraction notes: protected bike-lane curb, compact European lane width, separator/edge material.

#### P-07 — Paris bus lane 2014
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Bus_lane_Paris_2014.JPG/1280px-Bus_lane_Paris_2014.JPG
- Page: https://commons.wikimedia.org/wiki/File:Bus_lane_Paris_2014.JPG
- License/source note: CC BY-SA 4.0 / Steven Lek / Wikimedia Commons.
- Why usable: direct bus-lane road-marking reference.
- UE extraction notes: bus-lane stencil/paint style, lane edge, asphalt roughness, curbside constraints.

#### P-08 — Rue de Turenne, Paris
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Rue_de_Turenne%2C_Paris_October_2010.jpg/1280px-Rue_de_Turenne%2C_Paris_October_2010.jpg
- Page: https://commons.wikimedia.org/wiki/File:Rue_de_Turenne,_Paris_October_2010.jpg
- License/source note: CC BY 2.0 / jean-louis Zimmermann / Wikimedia Commons.
- Why usable: Paris street/bus-lane markings and urban road surface visible from above.
- UE extraction notes: narrow street proportions, bus-lane text, curbside lane placement, asphalt material variation.

#### P-09 — Rue La Fayette protected bike-lane intersection
- Status: `approved`
- Image: https://live.staticflickr.com/65535/53631159528_e89dca652a_b.jpg
- Page: https://www.flickr.com/photos/122687277@N03/53631159528
- License/source note: Openverse/Flickr record indicates BY-SA / philip.mallis; confirm on page before final attribution.
- Why usable: line marking at intersection with bicycles/protected bike lane in Paris.
- UE extraction notes: protected lane linework, bike-lane intersection markings, Paris cycling infrastructure paint.

### Paris pending / supplemental

#### P-10 — Official/design-guidance supplement for sas vélo and bus/bike/taxi conventions
- Status: `pending`
- Image/page: use official Paris/French road-marking guidance only after selecting exact image/page references.
- License/source note: pending.
- Why pending: needed to standardize `sas vélo`, shared lane text, and French sign/marking conventions when photos are partial.
- UE extraction notes if approved: advanced stop boxes, bike stencils, shared bus/bike/taxi lane symbols.

### Paris rejected / do not use

- Valladolid, Spain cyclist crossing false positive: `rejected` because city/country is wrong.
- Ljubljana false positive: `rejected` because city/country is wrong.
- Brazil DjVu/book scan: `rejected` because it is not a road/intersection image.
- Church/building-square photos where the road is secondary or obscured: `rejected` unless road markings dominate.
- Champs-Élysées/landmark/crowd photos: `rejected` unless road/crosswalk/markings are unobstructed.

---

## London

### London accepted / approval-ready

#### L-01 — Yellow box junction, Cromwell Road
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Yellow_box_junction%2C_Cromwell_Road_-_geograph.org.uk_-_5203376.jpg/1280px-Yellow_box_junction%2C_Cromwell_Road_-_geograph.org.uk_-_5203376.jpg
- Page: https://commons.wikimedia.org/wiki/File:Yellow_box_junction,_Cromwell_Road_-_geograph.org.uk_-_5203376.jpg
- License/source note: CC BY-SA 2.0 / Richard Sutcliffe / Wikimedia Commons/Geograph.
- Why usable: strong London yellow box junction marking with visible road surface.
- UE extraction notes: yellow criss-cross grid geometry, worn paint, left-hand UK junction layout, asphalt color/texture.

#### L-02 — Yellow box junction, UK/London-style reference
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/e/e6/Yellow_box_junction_-_geograph.org.uk_-_7843165.jpg
- Page: https://commons.wikimedia.org/wiki/File:Yellow_box_junction_-_geograph.org.uk_-_7843165.jpg
- License/source note: CC BY-SA 2.0 / Graham Hogg / Wikimedia Commons/Geograph.
- Why usable: clear yellow box geometry and paint-wear detail.
- UE extraction notes: box grid line width, diagonal spacing, worn yellow paint edge breakup.

#### L-03 — Tottenham Bus Garage Entrance
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Tottenham_Bus_Garage_Entrance.jpg/1280px-Tottenham_Bus_Garage_Entrance.jpg
- Page: https://commons.wikimedia.org/wiki/File:Tottenham_Bus_Garage_Entrance.jpg
- License/source note: CC BY-SA 2.0 / Alan Stanton / Wikimedia Commons.
- Why usable: bus-operational London road context with yellow box and worn markings.
- UE extraction notes: damaged yellow box markings, bus corridor/garage-adjacent asphalt wear, UK curbside lane markings.

#### L-04 — West End Lane / Finchley Road junction, Hampstead
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/b/b5/West_End_Lane_junction_with_Finchley_Road%2C_Hampstead_-_geograph.org.uk_-_40287.jpg
- Page: https://commons.wikimedia.org/wiki/File:West_End_Lane_junction_with_Finchley_Road,_Hampstead_-_geograph.org.uk_-_40287.jpg
- License/source note: CC BY-SA 2.0 / David Hawgood / Wikimedia Commons/Geograph.
- Why usable: London junction/curbside road language visible.
- UE extraction notes: double yellow curb lines, compact junction geometry, UK signals/signs, road-edge wear.

#### L-05 — Contraflow Bus and Bike Lane London
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/b/bd/Contraflow_Bus_and_Bike_Lane_London.jpg
- Page: https://commons.wikimedia.org/w/index.php?curid=148374100
- License/source note: Openverse/Commons record indicates BY-SA / Andrew Nash; confirm exact Commons page metadata before final attribution.
- Why usable: bus-bike lane treatment and road text are relevant to London road identity.
- UE extraction notes: `BUS LANE`/cycle-lane text, contraflow lane arrows, UK curbside signing and lane separation.

#### L-06 — Vauxhall Bridge red bus-lane/road corridor
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/5/56/Vauxhall_Bridge_%282%29_-_geograph.org.uk_-_831240.jpg
- Page: https://commons.wikimedia.org/w/index.php?curid=13522014
- License/source note: Openverse/Commons record indicates BY-SA / Nigel Cox; confirm exact Commons page metadata before final attribution.
- Why usable: London bus-lane/red-route corridor candidate with road markings visible enough for supplemental extraction.
- UE extraction notes: red bus-lane surface/edge, left-hand lane direction, curbside linework.

#### L-07 — Blacked-out in Theatreland / central London road markings
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/8/8b/Blacked-out_in_Theatreland.jpg
- Page: https://commons.wikimedia.org/wiki/File:Blacked-out_in_Theatreland.jpg
- License/source note: CC BY-SA 2.0 / Alan Stanton / Wikimedia Commons.
- Why usable: road-surface correction, parking/yellow line context and central-London asphalt/paint details.
- UE extraction notes: double yellow lines, black patch asphalt repair, lane/parking bay remnants, road maintenance wear.

#### L-08 — Ladysmith Road road markings
- Status: `approved`
- Image: https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Ladysmith_Road._Cryptic_clue_to_better_systems%3F.jpg/1280px-Ladysmith_Road._Cryptic_clue_to_better_systems%3F.jpg
- Page: https://commons.wikimedia.org/wiki/File:Ladysmith_Road._Cryptic_clue_to_better_systems%3F.jpg
- License/source note: CC BY-SA 2.0 / Alan Stanton / Wikimedia Commons.
- Why usable: UK/London road markings and asphalt repair detail are visible.
- UE extraction notes: curbside yellow/white linework, resurfaced asphalt patch contrast, worn urban road edge.

#### L-09 — Oxford Circus road crossing
- Status: `approved`
- Image: https://live.staticflickr.com/3786/13487346075_443b55861f_b.jpg
- Page: https://www.flickr.com/photos/41672704@N06/13487346075
- License/source note: Openverse/Flickr record indicates BY / mattcornock; confirm on page before final attribution.
- Why usable: crowded but still useful as a supplemental central-London crossing/junction view if road/crossing markings remain visible.
- UE extraction notes: central London crossing scale, signal/pole density, curb/crossing layout. Do not use crowd as reference.

### London pending / supplemental

#### L-10 — TfL / UK official marking guidance
- Status: `pending`
- Page: https://content.tfl.gov.uk/streetscape-guidance-.pdf
- Page: https://www.gov.uk/government/publications/traffic-signs-manual-chapter-5-road-markings
- License/source note: official guidance; check reuse and quote/image rules before using any diagram directly.
- Why pending: useful for standardizing `LOOK LEFT`, `LOOK RIGHT`, double yellow curb lines, stop lines, tactile paving, cycle boxes, and UK signal/road marking conventions.
- UE extraction notes if approved: exact yellow box grid rules, double yellow spacing, stop-line/cycle-box layout, tactile paving placement.

### London rejected / do not use

- Bus-interior, bus-only, or vehicle-dominated London images: `rejected` unless road markings are clearly visible.
- Piccadilly/Oxford tourist/crowd landmark photos: `rejected` if people/vehicles/buildings dominate or road surface is obscured.
- PaintShopPro/edited circular bus-lane images: `rejected` as manipulated/not reliable for road layout extraction.
- Olympic Games temporary lane references: `rejected` for baseline London identity unless explicitly building a temporary-lane variant.
- Non-London UK road images: `pending` or `rejected`; use only if clearly marked as generic UK marking supplement, not city identity.

---

## Cross-city extraction checklist for UE implementation agent

Use only after user approval. Keep first UE milestone road/intersection-only.

- Seoul: wide multi-lane arterial, large zebra crosswalks, thick stop lines, red/brown median bus corridor, Korean `버스전용` / `BUS ONLY`, yellow tactile paving, overhead mast-arm signals, dense poles/signage, manholes/patches.
- New York: continental/ladder crosswalks, thick stop bars, `ONLY` text/turn arrows, patched asphalt, manholes/utility plates/tar seams, concrete slab sidewalks, yellow signal heads, optional green bike lane/red bus lane only from approved/pending supplement.
- Paris: compact boulevard geometry, French zebra crossings, slim signal poles, `BUS`/bike/taxi shared lane markings, protected bike-lane separator, `sas vélo` if official/visual support is approved, stone/granite curb edges.
- London: left-hand layout, yellow box junction, red bus-lane treatment where supported, double yellow curb lines, `LOOK LEFT`/`LOOK RIGHT`/`BUS LANE`/`KEEP CLEAR`, UK black signal heads, refuge islands/keep-left bollards.

## Approval request

Please explicitly approve one of the following before any UE rebuild/destructive action:

1. Approve the full packet for Seoul/New York/Paris/London.
2. Approve a single city first, recommended: London because yellow box junctions are most distinctive for visual proof.
3. Reject selected references and request replacements before UE work.
