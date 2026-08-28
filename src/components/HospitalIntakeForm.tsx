import { useMemo, useRef, useState, type FormEvent } from 'react';
import type { HospitalInfo } from '../types/schedule';
import { withAutoMatchedLogo } from '../utils/hospitalLogoUtils';
import { createHospitalId, listHospitalInfos, loadHospitalWorkSummary } from '../utils/storageUtils';
import Modal from './Modal';
import styles from './HospitalIntakeForm.module.css';
import type { SharedSubmissionSummary } from '../utils/googleDriveUtils';

interface HospitalIntakeFormProps {
  onSubmit: (hospital: HospitalInfo) => void;
  onDeleteHospital: (hospital: HospitalInfo) => Promise<boolean>;
  showRecentHospitals?: boolean;
  sharedSubmissions?: SharedSubmissionSummary[];
  sharedSubmissionsLoading?: boolean;
  sharedSubmissionsError?: string;
  onOpenSharedSubmission?: (submissionId: string) => void;
}

const DEFAULT_PRIMARY_COLOR = '#2f6fed';

export default function HospitalIntakeForm({
  onSubmit,
  onDeleteHospital,
  showRecentHospitals = false,
  sharedSubmissions = [],
  sharedSubmissionsLoading = false,
  sharedSubmissionsError = '',
  onOpenSharedSubmission,
}: HospitalIntakeFormProps) {
  const [recentHospitals, setRecentHospitals] = useState(() => listHospitalInfos());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [expandedSubmissionGroups, setExpandedSubmissionGroups] = useState<Set<string>>(() => new Set());
  const [recentHospitalSearch, setRecentHospitalSearch] = useState('');
  const [expandedRecentHospitalGroups, setExpandedRecentHospitalGroups] = useState<Set<string>>(() => new Set());
  const [touched, setTouched] = useState({ name: false, directorName: false });
  const nameInputRef = useRef<HTMLInputElement>(null);

  const getError = (value: string, emptyMessage: string) => {
    if (value.length === 0) return emptyMessage;
    if (value.trim().length === 0) return '올바른 내용을 입력해 주세요.';
    return null;
  };

  const nameError = touched.name ? getError(name, '치과명을 입력해 주세요.') : null;
  const directorNameError = touched.directorName
    ? getError(directorName, '대표원장 성함을 입력해 주세요.')
    : null;
  const isValid = name.trim().length > 0 && directorName.trim().length > 0;
  const submissionGroups = useMemo(() => {
    const query = submissionSearch.trim().toLocaleLowerCase('ko-KR').replace(/\s/g, '');
    const grouped = new Map<string, SharedSubmissionSummary[]>();
    sharedSubmissions.forEach((submission) => {
      const searchableName = submission.hospitalName.toLocaleLowerCase('ko-KR').replace(/\s/g, '');
      if (query && !searchableName.includes(query)) return;
      const groupKey = `${searchableName}:${submission.year ?? ''}:${submission.month ?? ''}`;
      const items = grouped.get(groupKey) ?? [];
      items.push(submission);
      grouped.set(groupKey, items);
    });
    return Array.from(grouped, ([key, items]) => ({
      key,
      items: items.sort((left, right) => Date.parse(right.savedAt ?? '') - Date.parse(left.savedAt ?? '')),
    })).sort((left, right) => Date.parse(right.items[0]?.savedAt ?? '') - Date.parse(left.items[0]?.savedAt ?? ''));
  }, [sharedSubmissions, submissionSearch]);
  const recentHospitalGroups = useMemo(() => {
    const query = recentHospitalSearch.trim().toLocaleLowerCase('ko-KR').replace(/\s/g, '');
    const grouped = new Map<string, HospitalInfo[]>();
    recentHospitals.forEach((hospital) => {
      const key = hospital.name.normalize('NFC').toLocaleLowerCase('ko-KR').replace(/\s/g, '');
      if (query && !key.includes(query)) return;
      grouped.set(key, [...(grouped.get(key) ?? []), hospital]);
    });
    return Array.from(grouped, ([key, hospitals]) => ({ key, hospitals, latest: hospitals[0] }));
  }, [recentHospitals, recentHospitalSearch]);

  const formatSubmittedAt = (value?: string) => value
    ? new Date(value).toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '제출일 없음';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, directorName: true });
    const trimmedName = name.trim();
    const trimmedDirectorName = directorName.trim();
    if (!trimmedName || !trimmedDirectorName) return;
    onSubmit(withAutoMatchedLogo({
      id: createHospitalId(),
      name: trimmedName,
      directorName: trimmedDirectorName,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      storageVersion: 2,
    }));
  };

  return (
    <Modal
      title="치과 정보를 입력해 주세요"
      onClose={() => {}}
      closable={false}
      panelClassName={styles.panel}
      descriptionId="hospital-intake-description"
      initialFocusRef={nameInputRef}
      titleClassName={styles.title}
      leadingVisual={(
        <span className={styles.icon} aria-hidden="true">
          <img className={styles.iconImage} src="/favicon.png" alt="" />
        </span>
      )}
    >
      <form className={styles.form} onSubmit={handleSubmit} autoComplete="off" noValidate>
        <div className={styles.intro}>
          <p id="hospital-intake-description" className={styles.subtitle}>
            진료일정 제작과 맞춤 제작 요청에 필요한 기본 정보예요.
          </p>
        </div>

        {showRecentHospitals && (
          <section className={styles.recentSection} aria-labelledby="submitted-hospitals-title">
            <div className={styles.recentHeading}>
              <h3 id="submitted-hospitals-title">원장님 제출 데이터</h3>
              <span>제출된 화면을 그대로 불러옵니다</span>
            </div>
            <label className={styles.submissionSearch}>
              <span className={styles.visuallyHidden}>병원명 검색</span>
              <input
                type="search"
                placeholder="병원명 검색"
                value={submissionSearch}
                onChange={(event) => setSubmissionSearch(event.target.value)}
              />
            </label>
            {sharedSubmissionsLoading && <p>제출 데이터를 불러오는 중입니다…</p>}
            {sharedSubmissionsError && <p className={styles.error}>{sharedSubmissionsError}</p>}
            {!sharedSubmissionsLoading && !sharedSubmissionsError && sharedSubmissions.length === 0 && (
              <p>아직 불러올 수 있는 제출 데이터가 없습니다.</p>
            )}
            {sharedSubmissions.length > 0 && submissionGroups.length === 0 && <p>검색 결과가 없습니다.</p>}
            {submissionGroups.length > 0 && (
              <div className={styles.submissionGroupList}>
                {submissionGroups.map(({ key, items }) => {
                  const latest = items[0];
                  const previousItems = items.slice(1);
                  const expanded = expandedSubmissionGroups.has(key);
                  const renderSubmission = (submission: SharedSubmissionSummary, previous = false) => (
                    <div className={`${styles.submissionCard}${previous ? ` ${styles.previousSubmission}` : ''}`} key={submission.submissionId}>
                      <div className={styles.submissionInfo}>
                        <strong>{submission.hospitalName}</strong>
                        <span className={styles.submissionMonth}>
                          {submission.year && submission.month ? `${submission.year}년 ${submission.month}월 진료일정` : '진료일정'}
                        </span>
                        <span>{previous ? '이전 제출' : '최근 제출'}: {formatSubmittedAt(submission.savedAt)}</span>
                      </div>
                      <button type="button" className={styles.openSubmissionButton} onClick={() => onOpenSharedSubmission?.(submission.submissionId)}>
                        데이터 보기
                      </button>
                    </div>
                  );
                  return (
                    <section className={styles.submissionGroup} key={key}>
                      {renderSubmission(latest)}
                      {previousItems.length > 0 && (
                        <>
                          <button
                            type="button"
                            className={styles.previousToggle}
                            aria-expanded={expanded}
                            onClick={() => setExpandedSubmissionGroups((current) => {
                              const next = new Set(current);
                              if (next.has(key)) next.delete(key);
                              else next.add(key);
                              return next;
                            })}
                          >
                            이전 제출 {previousItems.length}건 {expanded ? '▴' : '▾'}
                          </button>
                          {expanded && <div className={styles.previousList}>{previousItems.map((item) => renderSubmission(item, true))}</div>}
                        </>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {showRecentHospitals && recentHospitals.length > 0 && (
          <section className={styles.recentSection} aria-labelledby="recent-hospitals-title">
            <div className={styles.recentHeading}>
              <h3 id="recent-hospitals-title">최근 병원</h3>
              <span>이 브라우저에 저장된 작업</span>
            </div>
            <label className={styles.submissionSearch}>
              <span className={styles.visuallyHidden}>최근 병원 검색</span>
              <input type="search" placeholder="병원명 검색" value={recentHospitalSearch} onChange={(event) => setRecentHospitalSearch(event.target.value)} />
            </label>
            {recentHospitalGroups.length === 0 && <p>검색 결과가 없습니다.</p>}
            <div className={styles.submissionGroupList}>
              {recentHospitalGroups.map(({ key, hospitals, latest }) => {
                const previousHospitals = hospitals.slice(1);
                const expanded = expandedRecentHospitalGroups.has(key);
                const renderHospital = (hospital: HospitalInfo, previous = false) => {
                  const work = loadHospitalWorkSummary(hospital.id);
                  return (
                  <div className={`${styles.recentItem}${previous ? ` ${styles.previousSubmission}` : ''}`} key={hospital.id}>
                    <button type="button" className={styles.recentSelect} onClick={() => onSubmit(withAutoMatchedLogo(hospital))}>
                      <strong>{hospital.name}</strong>
                      <span className={styles.submissionMonth}>
                        {work ? `${work.year}년 ${work.month}월 진료일정` : '저장된 진료일정'}
                      </span>
                      <span>{previous ? '이전 저장' : '최근 저장'}: {work?.savedAt ? formatSubmittedAt(work.savedAt) : '저장일시 정보 없음'}</span>
                      {hospital.directorName && <span>{hospital.directorName} 원장</span>}
                    </button>
                    {deleteConfirmId === hospital.id ? (
                      <div className={styles.deleteConfirm}>
                        <span>삭제할까요?</span>
                        <button type="button" onClick={() => setDeleteConfirmId(null)}>취소</button>
                        <button type="button" className={styles.deleteConfirmButton} onClick={async () => {
                          setDeleteError(null);
                          const removed = await onDeleteHospital(hospital);
                          if (!removed) {
                            setDeleteError('병원 데이터를 삭제하지 못했습니다.');
                            return;
                          }
                          setRecentHospitals((current) => current.filter((item) => item.id !== hospital.id));
                          setDeleteConfirmId(null);
                        }}>삭제</button>
                      </div>
                    ) : (
                      <button type="button" className={styles.deleteButton} aria-label={`${hospital.name} 저장 데이터 삭제`} onClick={() => setDeleteConfirmId(hospital.id)}>삭제</button>
                    )}
                  </div>
                  );
                };
                return (
                  <section className={styles.submissionGroup} key={key}>
                    {renderHospital(latest)}
                    {previousHospitals.length > 0 && (
                      <>
                        <button type="button" className={styles.previousToggle} aria-expanded={expanded} onClick={() => setExpandedRecentHospitalGroups((current) => {
                          const next = new Set(current);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        })}>이전 저장 {previousHospitals.length}건 {expanded ? '▴' : '▾'}</button>
                        {expanded && <div className={styles.previousList}>{previousHospitals.map((hospital) => renderHospital(hospital, true))}</div>}
                      </>
                    )}
                  </section>
                );
              })}
            </div>
            {deleteError && <p className={styles.error} role="alert">{deleteError}</p>}
          </section>
        )}

        {showRecentHospitals && recentHospitals.length > 0 && (
          <div className={styles.divider}><span>새 병원 등록</span></div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="hospital-name">
            치과명 <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            ref={nameInputRef}
            id="hospital-name"
            type="text"
            className={`${styles.input}${nameError ? ` ${styles.inputError}` : ''}`}
            autoComplete="off"
            placeholder="OO치과의원"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setTouched((current) => ({ ...current, name: false }));
            }}
            onBlur={() => setTouched((current) => ({ ...current, name: true }))}
            required
            aria-invalid={nameError ? 'true' : undefined}
            aria-describedby={nameError ? 'hospital-name-error' : undefined}
          />
          {nameError && <p id="hospital-name-error" className={styles.error}>{nameError}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="director-name">
            대표원장 성함 <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            id="director-name"
            type="text"
            className={`${styles.input}${directorNameError ? ` ${styles.inputError}` : ''}`}
            autoComplete="off"
            placeholder="홍길동"
            value={directorName}
            onChange={(e) => {
              setDirectorName(e.target.value);
              setTouched((current) => ({ ...current, directorName: false }));
            }}
            onBlur={() => setTouched((current) => ({ ...current, directorName: true }))}
            required
            aria-invalid={directorNameError ? 'true' : undefined}
            aria-describedby={directorNameError ? 'director-name-error' : undefined}
          />
          {directorNameError && <p id="director-name-error" className={styles.error}>{directorNameError}</p>}
        </div>

        <button type="submit" className={styles.submit} disabled={!isValid}>
          진료일정 만들기
        </button>
      </form>
    </Modal>
  );
}
