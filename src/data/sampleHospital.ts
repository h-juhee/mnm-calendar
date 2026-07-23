import type { HospitalInfo } from '../types/schedule';
import sampleLogo from '../assets/sample-logo.svg';

// MVP에서는 서버 연동 전까지 샘플 병원 데이터를 사용합니다.
export const SAMPLE_HOSPITAL: HospitalInfo = {
  id: 'sample-dental-01',
  name: '서울다온치과',
  logoUrl: sampleLogo,
  primaryColor: '#2f6fed',
  phone: '02-1234-5678',
  address: '서울시 강남구 테헤란로 123',
};
