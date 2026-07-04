import type { CityProfile } from "./types";

export const CITY_PROFILES: CityProfile[] = [
  {
    id: "seoul",
    labelKo: "서울",
    labelEn: "Seoul",
    intersectionId: "INT-SEO-0001",
    intersectionNameKo: "강남대로 / 테헤란로",
    intersectionNameEn: "Gangnam-daero / Teheran-ro",
    districtKo: "서울 강남",
    districtEn: "Gangnam, Seoul",
    countryCode: "KR",
    timezone: "Asia/Seoul",
    mobilityProfileKo: "보행·버스 수요가 높은 도심 간선 교차로",
    mobilityProfileEn: "Urban arterial with high pedestrian and bus demand"
  }
];

export const DEFAULT_CITY_ID = "seoul" satisfies CityProfile["id"];
