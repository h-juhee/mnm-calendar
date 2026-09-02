import type { HospitalInfo } from '../types/schedule';

const DB_NAME = 'mnn-calendar-assets';
const STORE_NAME = 'logos';
const DB_VERSION = 2;

/**
 * 제출 당시의 작업 데이터는 이후 디자이너가 교체한 로고를 알지 못합니다.
 * 같은 브라우저에서 다시 열 때에는 로컬에 저장된 로고 변경분만 서버 사본 위에 복원합니다.
 * logoAssetId 검사는 logoUpdatedAt 도입 전에 저장된 사용자 로고도 복구하기 위한 호환 처리입니다.
 */
export function restoreLocallyEditedLogo(shared: HospitalInfo, local?: HospitalInfo): HospitalInfo {
  if (!local || local.id !== shared.id || (!local.logoAssetId && !local.logoUpdatedAt)) return shared;
  return {
    ...shared,
    logoUrl: local.logoUrl,
    logoFileName: local.logoFileName,
    logoAssetId: local.logoAssetId,
    logoUpdatedAt: local.logoUpdatedAt,
    displayMode: local.displayMode,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('backgrounds')) db.createObjectStore('backgrounds');
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveHospitalLogo(assetId: string, file: File): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(file, assetId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function loadHospitalLogo(assetId: string): Promise<File | null> {
  const db = await openDatabase();
  try {
    return await new Promise<File | null>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(assetId);
      request.onsuccess = () => resolve(request.result instanceof File ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteHospitalLogo(assetId: string): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(assetId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, encoded = ''] = dataUrl.split(',', 2);
  const mimeType = /^data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], fileName, { type: mimeType });
}

export async function hydrateHospitalLogo(hospital: HospitalInfo): Promise<HospitalInfo> {
  if (hospital.logoAssetId) {
    const file = await loadHospitalLogo(hospital.logoAssetId);
    if (!file) return { ...hospital, logoUrl: undefined, logoAssetId: undefined };
    return { ...hospital, logoUrl: URL.createObjectURL(file), logoFileName: hospital.logoFileName ?? file.name };
  }
  if (!hospital.logoUrl?.startsWith('data:')) return hospital;

  const assetId = hospital.id;
  const file = dataUrlToFile(hospital.logoUrl, hospital.logoFileName ?? 'logo');
  await saveHospitalLogo(assetId, file);
  return { ...hospital, logoAssetId: assetId, logoUrl: URL.createObjectURL(file) };
}
