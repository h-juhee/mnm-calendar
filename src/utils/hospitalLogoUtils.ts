import type { HospitalInfo } from '../types/schedule';

// public/logos에 파일을 추가할 때 이 목록에도 파일명을 추가해 주세요.
export const HOSPITAL_LOGO_FILES = [
  '365고양제일치과의원 로고.png', '365라온누리치과_로고.png', '365베스트치과_로고.png',
  '365서울앞선치과_로고.png', '365서울트윈치과.png', '365이룩치과_로고.png', '365편한일층치과_로고.png',
  '강남사랑니치과의원_로고.png', '굿플란트치과_로고.png', '그랜드치과로고_v2 사본 1.png', '나란이턱치과.png',
  '나주 빛가람플란트치과_로고.png', '네이처쥬니어치과_로고.png', '다인아트치과_로고.png',
  '당신의치과_로고.png', '더센트럴치과의원_로고.png', '더신중한치과_로고.png',
  '더케이365치과_로고.png', '디어스마일교정치과_로고.png', '라인드교정전문치과_로고.png',
  '리더스윤안과_로고.png', '리온치과_로고.png', '마니55플란트치과_로고.png',
  '마음담은치과_로고.png', '맘편한유치과_로고.png', '미담은치과_로고.png',
  '미소봄치과의원_로고.png', '바로플란트치과_로고.png', '바른공감치과 검단신도시_로고.png',
  '바른공감치과 본원_로고.png', '바른선택치과_로고.png', '바른턱웰빙명인치과_로고.png',
  '베스트플란트치과_로고.png', '빛가람플란트치과_로고.png', '산본중심치과_로고.png',
  '삼성프라임치과.png',
  '상상플란트치과_로고.png', '서울곧은치과_로고.png', '서울권치과_로고.png', '서울근본치과_로고.png',
  '서울다온치과_로고.png', '서울다온치과2_로고.png', '서울더공감치과_로고.png', '서울더탑치과_로고.png',
  '서울든든치과_로고.png', '서울마인드치과_로고.png', '서울명치과_로고.png', '서울미드림치과_로고.png',
  '서울바른수치과_로고.png', '서울바름치과_로고.png', '서울상록수치과_로고.png',
  '서울스마트치과_로고.png',
  '서울오래치과_로고.png', '서울온건치과_로고.png', '서울이랑드치과_로고.png',
  '서울이도치과_로고.png', '서울일등치과_로고.png', '서울정다움치과_로고.png', '서울천사치과_로고.png',
  '서울케이플란트치과_로고.png', '서울파트너치과_로고.png', '서창신세계치과_로고.png',
  '시카고치과_로고.png', '썬프라자치과의원_로고.png', '아이콘교정치과의원_로고.png',
  '안녕하유치과_로고.png',
  '예담스마트치과_로고.png', '연세365감동치과_로고.png', '연세가이드치과_로고.png', '연세꿈꾸는치과교정과_로고.png',
  '연세다온치과로고.png', '연세맘편한치과_로고.png', '연세바로치과교정과의원.png',
  '연세바른치과_로고.png', '연세세브란스치과 금천_로고.png', '연세세브란스치과 병점_로고.png',
  '연세세브란스치과 봉천_로고.png', '연세스탠다드치과_로고.png', '연세영치과_로고.png',
  '연세이루다치과.png', '연세참다운치과_로고 1.png', '연세탑치과의원_로고.png',
  '연세푸르다치과_로고.png', '연세현세치과의원_로고.png', '오남플란트치과_로고.png',
  '올바로치과_로고.png', '왕편한플란트치과_로고.png', '위드미치과_로고.png',
  '유어스치과_로고.png', '이백점치과_로고.png', '잇몸미학치주과.png',
  '정다운플란트치과_로고.png', '진심스마트치과_로고.png', '진심을다하는치과_로고.png',
  '진심을보는치과_로고.png', '주희네병원_로고.png', '채움과이음치과의원_로고.png',
  '청주더좋은치과_로고.png', '충주본365치과_로고.png', '충주서울연세치과_로고.png', '치아살리는치과_로고.png',
  '키즈앤패밀리치과_로고.png', '킹덤치과_로고.png', '트루치과_로고.png',
  '파주 연세세브란스치과_로고.png', '퍼스트탑치과_로고.png',
  '하얀고운치과_로고.png',
] as const;

function withoutExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

function clinicNameFromFile(fileName: string): string {
  return withoutExtension(fileName)
    .replace(/(?:[_\s-]*로고)(?:[_\s-]*v\d+)?(?:[_\s-]*사본)?(?:[_\s-]*\d+)?$/iu, '')
    .trim();
}

function normalizeClinicName(value: string): string {
  return value
    .normalize('NFC')
    .toLocaleLowerCase('ko-KR')
    .replace(/[\s_.·,()-]/gu, '');
}

function relaxedClinicName(value: string): string {
  return normalizeClinicName(value)
    .replace(/치주과치과(?:의원)?$/u, '치주과')
    .replace(/치과의원$/u, '치과')
    .replace(/안과의원$/u, '안과');
}

function shortenedClinicName(value: string): string {
  return normalizeClinicName(value)
    .replace(/(?:의원|병원)$/u, '')
    .replace(/치과교정과$/u, '교정')
    .replace(/교정치과$/u, '교정')
    .replace(/치주과치과$/u, '치주')
    .replace(/치주과$/u, '치주')
    .replace(/치과$/u, '');
}

export function findHospitalLogoUrl(hospitalName: string): string | undefined {
  const exactName = normalizeClinicName(hospitalName);

  // 연세바로치과교정과는 지점명이 붙어도 모든 지점이 같은 로고를 사용합니다.
  if (exactName.includes('연세바로')) {
    return `/logos/${encodeURIComponent('연세바로치과교정과의원.png')}`;
  }

  const exactMatches = HOSPITAL_LOGO_FILES.filter(
    (fileName) => normalizeClinicName(clinicNameFromFile(fileName)) === exactName,
  );

  const relaxedMatches = exactMatches.length === 0
    ? HOSPITAL_LOGO_FILES.filter(
      (fileName) => relaxedClinicName(clinicNameFromFile(fileName)) === relaxedClinicName(hospitalName),
    )
    : [];
  const shortenedMatches = exactMatches.length === 0 && relaxedMatches.length === 0
    ? HOSPITAL_LOGO_FILES.filter(
      (fileName) => shortenedClinicName(clinicNameFromFile(fileName)) === shortenedClinicName(hospitalName),
    )
    : [];
  const matches = exactMatches.length > 0
    ? exactMatches
    : relaxedMatches.length > 0
      ? relaxedMatches
      : shortenedMatches;

  // 비슷한 이름이 둘 이상이면 잘못된 로고를 자동 적용하지 않습니다.
  if (matches.length !== 1) return undefined;
  return `/logos/${encodeURIComponent(matches[0])}`;
}

export function withAutoMatchedLogo(hospital: HospitalInfo): HospitalInfo {
  if (hospital.logoUrl) return hospital;
  const logoUrl = findHospitalLogoUrl(hospital.name);
  if (!logoUrl) return hospital;

  return {
    ...hospital,
    logoUrl,
    logoFileName: decodeURIComponent(logoUrl.split('/').at(-1) ?? ''),
    displayMode: 'logo',
  };
}
