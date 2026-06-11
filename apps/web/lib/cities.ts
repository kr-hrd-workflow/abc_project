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
  },
  {
    id: "new_york",
    labelKo: "뉴욕",
    labelEn: "New York",
    intersectionId: "INT-NYC-0001",
    intersectionNameKo: "브로드웨이 / W 42번가",
    intersectionNameEn: "Broadway / W 42nd St",
    districtKo: "뉴욕 맨해튼 미드타운",
    districtEn: "Midtown Manhattan, New York",
    countryCode: "US",
    timezone: "America/New_York",
    mobilityProfileKo: "보행 밀도가 높은 격자형 도심 교차로",
    mobilityProfileEn: "Dense grid intersection with heavy pedestrian phases"
  },
  {
    id: "paris",
    labelKo: "파리",
    labelEn: "Paris",
    intersectionId: "INT-PAR-0001",
    intersectionNameKo: "샹젤리제 거리 / 조르주 V 거리",
    intersectionNameEn: "Avenue des Champs-Élysées / Avenue George V",
    districtKo: "파리 8구",
    districtEn: "8th arrondissement, Paris",
    countryCode: "FR",
    timezone: "Europe/Paris",
    mobilityProfileKo: "버스·택시 우선 검토가 필요한 대로형 교차로",
    mobilityProfileEn: "Boulevard crossing with bus and taxi priority review"
  },
  {
    id: "london",
    labelKo: "런던",
    labelEn: "London",
    intersectionId: "INT-LON-0001",
    intersectionNameKo: "옥스퍼드 스트리트 / 리젠트 스트리트",
    intersectionNameEn: "Oxford St / Regent St",
    districtKo: "런던 웨스트엔드",
    districtEn: "West End, London",
    countryCode: "GB",
    timezone: "Europe/London",
    mobilityProfileKo: "보행 중심 상업지와 버스 회랑이 만나는 교차로",
    mobilityProfileEn: "Pedestrian-heavy commercial junction with bus corridor"
  }
];

export const DEFAULT_CITY_ID = "seoul" satisfies CityProfile["id"];
