export type FontId =
  | 'pretendard'
  | 'notoSansKr'
  | 'ibmPlexSansKr'
  | 'gowunDodum'
  | 'gowunBatang'
  | 'nanumGothic'
  | 'nanumMyeongjo'
  | 'doHyeon'
  | 'blackHanSans'
  | 'jua'
  | 'maruBuri'
  | 'esamanru'
  | 'soyoDanpung'
  | 'orbit'
  | 'daeAmLeeTaeJun'
  | 'dovemayoGothic'
  | 'lineSeed'
  | 'yangjin'
  | 'kccChassam';

export interface FontOption {
  id: FontId;
  /** 폰트 선택 UI에 표시할 이름. */
  name: string;
  /** 실제 렌더링에 사용할 CSS font-family 값(폴백 체인 포함). */
  family: string;
  /** Google Fonts CSS2 API에 전달할 family 파라미터. 번들 폰트(Pretendard)는 없음. */
  googleFontsParam?: string;
  /** document.fonts.load()에 사용할 따옴표 없는 family 이름. */
  cssFamilyName?: string;
  /** Google Fonts 이외의 웹폰트를 불러오기 위한 @font-face 선언입니다. */
  fontFaceCss?: string;
}

export const DEFAULT_FONT_ID: FontId = 'pretendard';

const FALLBACK_CHAIN =
  "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Roboto, 'Malgun Gothic', sans-serif";

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'pretendard',
    name: 'Pretendard',
    family: `'Pretendard Variable', 'Pretendard', ${FALLBACK_CHAIN}`,
  },
  {
    id: 'notoSansKr',
    name: 'Noto Sans KR',
    family: `'Noto Sans KR', ${FALLBACK_CHAIN}`,
    googleFontsParam: 'Noto+Sans+KR:wght@400;700;900',
    cssFamilyName: 'Noto Sans KR',
  },
  {
    id: 'ibmPlexSansKr',
    name: 'IBM Plex Sans KR',
    family: `'IBM Plex Sans KR', ${FALLBACK_CHAIN}`,
    googleFontsParam: 'IBM+Plex+Sans+KR:wght@400;600;700',
    cssFamilyName: 'IBM Plex Sans KR',
  },
  {
    id: 'gowunDodum',
    name: 'Gowun Dodum',
    family: `'Gowun Dodum', ${FALLBACK_CHAIN}`,
    googleFontsParam: 'Gowun+Dodum',
    cssFamilyName: 'Gowun Dodum',
  },
  {
    id: 'gowunBatang',
    name: 'Gowun Batang',
    family: `'Gowun Batang', ${FALLBACK_CHAIN}`,
    googleFontsParam: 'Gowun+Batang:wght@400;700',
    cssFamilyName: 'Gowun Batang',
  },
  {
    id: 'nanumGothic',
    name: 'Nanum Gothic',
    family: `'Nanum Gothic', ${FALLBACK_CHAIN}`,
    googleFontsParam: 'Nanum+Gothic:wght@400;700;800',
    cssFamilyName: 'Nanum Gothic',
  },
  {
    id: 'nanumMyeongjo',
    name: 'Nanum Myeongjo',
    family: `'Nanum Myeongjo', ${FALLBACK_CHAIN}`,
    googleFontsParam: 'Nanum+Myeongjo:wght@400;700;800',
    cssFamilyName: 'Nanum Myeongjo',
  },
  {
    id: 'doHyeon',
    name: 'Do Hyeon',
    family: `'Do Hyeon', ${FALLBACK_CHAIN}`,
    googleFontsParam: 'Do+Hyeon',
    cssFamilyName: 'Do Hyeon',
  },
  {
    id: 'blackHanSans',
    name: 'Black Han Sans',
    family: `'Black Han Sans', ${FALLBACK_CHAIN}`,
    googleFontsParam: 'Black+Han+Sans',
    cssFamilyName: 'Black Han Sans',
  },
  {
    id: 'jua',
    name: 'Jua',
    family: `'Jua', ${FALLBACK_CHAIN}`,
    googleFontsParam: 'Jua',
    cssFamilyName: 'Jua',
  },
  {
    id: 'maruBuri',
    name: '마루부리',
    family: `'MaruBuri', ${FALLBACK_CHAIN}`,
    cssFamilyName: 'MaruBuri',
    fontFaceCss: `@font-face{font-family:'MaruBuri';src:url('https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Regular.woff2') format('woff2');font-weight:400;font-display:swap}@font-face{font-family:'MaruBuri';src:url('https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Bold.woff2') format('woff2');font-weight:700 900;font-display:swap}`,
  },
  {
    id: 'esamanru',
    name: '이사만루체',
    family: `'GongGothic', ${FALLBACK_CHAIN}`,
    cssFamilyName: 'GongGothic',
    fontFaceCss: `@font-face{font-family:'GongGothic';src:url('https://cdn.jsdelivr.net/gh/fontbee/font@main/Gonggames/GongGothicLight.woff') format('woff');font-weight:300;font-display:swap}@font-face{font-family:'GongGothic';src:url('https://cdn.jsdelivr.net/gh/fontbee/font@main/Gonggames/GongGothicMedium.woff') format('woff');font-weight:400 600;font-display:swap}@font-face{font-family:'GongGothic';src:url('https://cdn.jsdelivr.net/gh/fontbee/font@main/Gonggames/GongGothicBold.woff') format('woff');font-weight:700 900;font-display:swap}`,
  },
  {
    id: 'soyoDanpung',
    name: '소요단풍체',
    family: `'SoyoDanpung', ${FALLBACK_CHAIN}`,
    cssFamilyName: 'SoyoDanpung',
    fontFaceCss: `@font-face{font-family:'SoyoDanpung';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2310@1.0/SOYOMapleRegularTTF.woff2') format('woff2');font-weight:400;font-display:swap}@font-face{font-family:'SoyoDanpung';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2310@1.0/SOYOMapleBoldTTF.woff2') format('woff2');font-weight:700 900;font-display:swap}`,
  },
  {
    id: 'orbit',
    name: '오르빗',
    family: `'Orbit', ${FALLBACK_CHAIN}`,
    googleFontsParam: 'Orbit',
    cssFamilyName: 'Orbit',
  },
  {
    id: 'daeAmLeeTaeJun',
    name: '대암 이태준체',
    family: `'DaeAmLeeTaeJun', ${FALLBACK_CHAIN}`,
    cssFamilyName: 'DaeAmLeeTaeJun',
    fontFaceCss: `@font-face{font-family:'DaeAmLeeTaeJun';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2312-1@1.1/DAEAM_LEE_TAE_JOON.woff2') format('woff2');font-weight:400 900;font-display:swap}`,
  },
  {
    id: 'dovemayoGothic',
    name: '둘기마요고딕',
    family: `'Dovemayo', ${FALLBACK_CHAIN}`,
    cssFamilyName: 'Dovemayo',
    fontFaceCss: `@font-face{font-family:'Dovemayo';src:url('https://cdn.jsdelivr.net/gh/fontbee/font@main/Dovemayo/Dovemayo-Medium.woff') format('woff');font-weight:400 600;font-display:swap}@font-face{font-family:'Dovemayo';src:url('https://cdn.jsdelivr.net/gh/fontbee/font@main/Dovemayo/Dovemayo-Bold.woff') format('woff');font-weight:700 900;font-display:swap}`,
  },
  {
    id: 'lineSeed',
    name: 'LINE Seed',
    family: `'LINE Seed KR', ${FALLBACK_CHAIN}`,
    cssFamilyName: 'LINE Seed KR',
    fontFaceCss: `@font-face{font-family:'LINE Seed KR';src:url('https://cdn.jsdelivr.net/gh/fontbee/font@main/Line/LINESeedKR-Rg.woff2') format('woff2');font-weight:400 600;font-display:swap}@font-face{font-family:'LINE Seed KR';src:url('https://cdn.jsdelivr.net/gh/fontbee/font@main/Line/LINESeedKR-Bd.woff2') format('woff2');font-weight:700 900;font-display:swap}`,
  },
  {
    id: 'yangjin',
    name: '양진체',
    family: `'Yangjin', ${FALLBACK_CHAIN}`,
    cssFamilyName: 'Yangjin',
    fontFaceCss: `@font-face{font-family:'Yangjin';src:url('https://cdn.jsdelivr.net/gh/fontbee/font@main/Kimyangjin/yangjin.woff') format('woff');font-weight:400 900;font-display:swap}`,
  },
  {
    id: 'kccChassam',
    name: 'KCC차쌤체',
    family: `'KCCChassam', ${FALLBACK_CHAIN}`,
    cssFamilyName: 'KCCChassam',
    fontFaceCss: `@font-face{font-family:'KCCChassam';src:url('https://cdn.jsdelivr.net/gh/fontbee/font@main/Copyright/KCCChassam.woff2') format('woff2');font-weight:400 900;font-display:swap}`,
  },
];

/** id에 해당하는 폰트를 찾아 반환하고, 없거나 지정되지 않았으면 기본값(Pretendard)으로 대체합니다. */
export function getFontOption(id: FontId | undefined): FontOption {
  return FONT_OPTIONS.find((font) => font.id === id) ?? FONT_OPTIONS[0];
}
