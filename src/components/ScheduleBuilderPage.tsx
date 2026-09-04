import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { HospitalInfo, ScheduleFormData } from '../types/schedule';
import { TEMPLATES } from '../types/schedule';
import { DEFAULT_FONT_ID, type FontId } from '../types/font';
import { useScheduleBuilder } from '../hooks/useScheduleBuilder';
import HospitalIntakeForm from './HospitalIntakeForm';
import LogoUploadField from './LogoUploadField';
import MonthSelector from './MonthSelector';
import CalendarLabelSelector from './CalendarLabelSelector';
import RecurringDaySelector from './RecurringDaySelector';
import CustomerGuideModal from './CustomerGuideModal';
import DateScheduleModal from './DateScheduleModal';
import VacationRangeField from './VacationRangeField';
import TemplateSelector from './TemplateSelector';
import TitleTextStyleSelector from './TitleTextStyleSelector';
import SchedulePreview from './SchedulePreview';
import ExportImageButton from './ExportImageButton';
import CustomDesignRequestModal from './CustomDesignRequestModal';
import Modal from './Modal';
import OutputFormatSelector from './OutputFormatSelector';
import { getOutputFormatMeta, type OutputFormat } from '../types/outputFormat';
import { renderNodeAsPng } from '../utils/exportUtils';
import ClinicHoursEditor from './ClinicHoursEditor';
import { deleteCustomBackground, loadCustomBackground, migrateCustomBackground, saveCustomBackground } from '../utils/backgroundStorage';
import { listHospitalInfos, removeHospitalData, removeHospitalInfo, saveHospitalInfo, saveScheduleDraft } from '../utils/storageUtils';
import { listSubmissionStatesFromDrive, loadSubmissionStateFromDrive, type SharedSubmissionSummary } from '../utils/googleDriveUtils';
import { getClinicHoursWithExample, parseNotionClinicHours } from '../utils/clinicHoursUtils';
import { flushPendingUsageLogs } from '../utils/usageLogUtils';
import { flushPendingSubmissions } from '../utils/submissionUtils';
import { deleteHospitalLogo, hydrateHospitalLogo, loadHospitalLogo, restoreLocallyEditedLogo, saveHospitalLogo } from '../utils/logoStorage';
import styles from './ScheduleBuilderPage.module.css';

type SettingsPanel =
  | 'basic' | 'closed' | 'vacation' | 'hours'
  | 'background' | 'elements';

type SettingsGroupId = 'schedule' | 'design';

const SETTINGS_GROUPS: { id: SettingsGroupId; label: string; items: { id: SettingsPanel; label: string }[] }[] = [
  {
    id: 'schedule',
    label: '일정 설정',
    items: [
      { id: 'basic', label: '기본 설정' },
      { id: 'closed', label: '정기 일정' },
      { id: 'vacation', label: '휴가 설정' },
      { id: 'hours', label: '진료시간' },
    ],
  },
  {
    id: 'design',
    label: '디자인 설정',
    items: [
      { id: 'background', label: '배경 이미지' },
      { id: 'elements', label: '요소 편집' },
    ],
  },
];

interface ScheduleBuilderPageProps {
  appMode: 'customer' | 'internal';
}

export default function ScheduleBuilderPage({ appMode }: ScheduleBuilderPageProps) {
  const [hospital, setHospital] = useState<HospitalInfo | null>(null);
  const [isCustomerGuideOpen, setCustomerGuideOpen] = useState(false);
  const [sharedSubmissionStatus, setSharedSubmissionStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [sharedSubmissionError, setSharedSubmissionError] = useState('');
  const [sharedSubmissions, setSharedSubmissions] = useState<SharedSubmissionSummary[]>([]);
  const [sharedSubmissionsLoading, setSharedSubmissionsLoading] = useState(appMode === 'internal');

  useEffect(() => {
    if (appMode !== 'internal') return;
    const submissionId = new URLSearchParams(window.location.search).get('submission');
    if (!submissionId) return;
    let cancelled = false;
    setSharedSubmissionStatus('loading');
    void loadSubmissionStateFromDrive<HospitalInfo, ScheduleFormData>(submissionId)
      .then(async (shared) => {
        if (cancelled) return;
        if (shared.version !== 1 || !shared.hospital?.id || !shared.formData?.hospitalId) {
          throw new Error('제출 작업 데이터 형식이 올바르지 않습니다.');
        }
        const localHospital = listHospitalInfos().find((item) => item.id === shared.hospital.id);
        const restoredHospital = restoreLocallyEditedLogo(shared.hospital, localHospital);
        const hydratedHospital = await hydrateHospitalLogo(restoredHospital);
        if (cancelled) return;
        saveHospitalInfo(hydratedHospital);
        saveScheduleDraft(shared.hospital.id, shared.formData.year, shared.formData.month, shared.formData);
        setHospital(hydratedHospital);
        setSharedSubmissionStatus('idle');
      })
      .catch((error) => {
        if (cancelled) return;
        setSharedSubmissionError(error instanceof Error ? error.message : '제출 작업을 불러오지 못했습니다.');
        setSharedSubmissionStatus('error');
      });
    return () => { cancelled = true; };
  }, [appMode]);

  useEffect(() => {
    if (appMode !== 'internal' || new URLSearchParams(window.location.search).has('submission')) return;
    let cancelled = false;
    setSharedSubmissionsLoading(true);
    void listSubmissionStatesFromDrive()
      .then((items) => {
        if (!cancelled) setSharedSubmissions(items);
      })
      .catch((error) => {
        if (!cancelled) setSharedSubmissionError(error instanceof Error ? error.message : '제출 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setSharedSubmissionsLoading(false);
      });
    return () => { cancelled = true; };
  }, [appMode]);

  const handleHospitalChange = useCallback((nextHospital: HospitalInfo) => {
    saveHospitalInfo(nextHospital);
    setHospital(nextHospital);
  }, []);

  const handleHospitalSubmit = useCallback(async (nextHospital: HospitalInfo) => {
    const hydratedHospital = await hydrateHospitalLogo(nextHospital);
    if (!saveHospitalInfo(hydratedHospital)) throw new Error('병원 정보를 저장하지 못했습니다.');
    setHospital(hydratedHospital);
    if (appMode !== 'customer') return;
    try {
      if (localStorage.getItem(`mnn:customerGuideSeen:v1:${hydratedHospital.id}`) !== '1') {
        setCustomerGuideOpen(true);
      }
    } catch {
      setCustomerGuideOpen(true);
    }
  }, [appMode]);

  const closeCustomerGuide = useCallback(() => {
    if (hospital) {
      try {
        localStorage.setItem(`mnn:customerGuideSeen:v1:${hospital.id}`, '1');
      } catch {
        // 저장 공간을 사용할 수 없어도 가이드는 정상적으로 닫습니다.
      }
    }
    setCustomerGuideOpen(false);
  }, [hospital]);

  const handleHospitalReset = useCallback(() => {
    removeHospitalInfo();
    const url = new URL(window.location.href);
    if (url.searchParams.has('submission')) {
      url.searchParams.delete('submission');
      window.location.assign(url.toString());
      return;
    }
    setHospital(null);
  }, []);

  const handleHospitalDelete = useCallback(async (target: HospitalInfo) => {
    try {
      await deleteCustomBackground(target.id);
      if (target.logoAssetId) await deleteHospitalLogo(target.logoAssetId);
      return removeHospitalData(target.id);
    } catch {
      return false;
    }
  }, []);

  if (!hospital && sharedSubmissionStatus === 'loading') {
    return <div role="status" style={{ padding: 32, textAlign: 'center' }}>원장님이 제출한 작업을 불러오는 중입니다…</div>;
  }

  if (!hospital && sharedSubmissionStatus === 'error') {
    return (
      <div role="alert" style={{ padding: 32, textAlign: 'center' }}>
        <p>{sharedSubmissionError}</p>
        <button
          type="button"
          className={styles.errorReturnButton}
          onClick={() => window.location.assign(window.location.pathname)}
        >
          일반 작업 화면으로 이동
        </button>
      </div>
    );
  }

  if (!hospital) {
    return (
      <HospitalIntakeForm
        onSubmit={handleHospitalSubmit}
        onDeleteHospital={handleHospitalDelete}
        showRecentHospitals={appMode === 'internal'}
        sharedSubmissions={sharedSubmissions}
        sharedSubmissionsLoading={sharedSubmissionsLoading}
        sharedSubmissionsError={sharedSubmissionError}
        onOpenSharedSubmission={(submissionId) => {
          const url = new URL(window.location.href);
          url.searchParams.set('submission', submissionId);
          window.location.assign(url.toString());
        }}
      />
    );
  }
  return (
    <>
      <ScheduleBuilderContent
        appMode={appMode}
        hospital={hospital}
        onHospitalChange={handleHospitalChange}
        onHospitalReset={handleHospitalReset}
        onOpenCustomerGuide={() => setCustomerGuideOpen(true)}
      />
      {appMode === 'customer' && isCustomerGuideOpen && (
        <CustomerGuideModal onClose={closeCustomerGuide} />
      )}
    </>
  );
}

function ScheduleBuilderContent({
  appMode,
  hospital,
  onHospitalChange,
  onHospitalReset,
  onOpenCustomerGuide,
}: {
  appMode: 'customer' | 'internal';
  hospital: HospitalInfo;
  onHospitalChange: (hospital: HospitalInfo) => void;
  onHospitalReset: () => void;
  onOpenCustomerGuide: () => void;
}) {
  const { formData, saveStatus, resolvedSchedule, resolvedByDate, calendarMatrix, actions } = useScheduleBuilder(hospital.id);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isCustomModalOpen, setCustomModalOpen] = useState(false);
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(
    () => appMode === 'internal' || formData.templateId === null,
  );
  const availableTemplates = useMemo(
    () => TEMPLATES.filter((template) => template.month === formData.month),
    [formData.month],
  );
  const hasSelectedTemplate = availableTemplates.some((template) => template.id === formData.templateId);
  const [isHospitalSwitchConfirmOpen, setHospitalSwitchConfirmOpen] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('square');
  const [isFormatSectionExpanded, setFormatSectionExpanded] = useState(true);
  const [settingsSpotlight, setSettingsSpotlight] = useState<{
    x: number;
    y: number;
    radiusX: number;
    radiusY: number;
  } | null>(null);
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<SettingsPanel>(
    appMode === 'customer' ? 'closed' : 'basic',
  );
  const [expandedSettingsGroup, setExpandedSettingsGroup] = useState<SettingsGroupId>('schedule');
  const [recurringClosedNone, setRecurringClosedNone] = useState(false);
  const [recurringNightNone, setRecurringNightNone] = useState(false);
  const [recurringSettingsError, setRecurringSettingsError] = useState('');
  const visibleSettingsGroups = appMode === 'customer'
    ? SETTINGS_GROUPS
      .filter((group) => group.id !== 'design')
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) => item.id !== 'basic' && item.id !== 'vacation' && item.id !== 'hours')
          .map((item) => item.id === 'closed' ? { ...item, label: '정기 일정' } : item),
      }))
    : SETTINGS_GROUPS;
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string>();
  const [customBackgroundFileName, setCustomBackgroundFileName] = useState<string>();
  const [notionClinicHoursPageUrl, setNotionClinicHoursPageUrl] = useState('');
  const [notionClinicHoursSpecialNotes, setNotionClinicHoursSpecialNotes] = useState('');
  const customBackgroundObjectUrlRef = useRef<string | undefined>(undefined);
  const hospitalLogoObjectUrlRef = useRef<string | undefined>(hospital.logoUrl?.startsWith('blob:') ? hospital.logoUrl : undefined);
  const exportNodeRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLElement>(null);
  const shouldFocusSettingsAfterTemplateRef = useRef(false);
  const spotlightClearTimerRef = useRef<number | null>(null);
  const setClinicHoursFromSheet = actions.setClinicHoursFromSheet;
  const setRecurringClosedNoMerge = actions.setRecurringClosedNoMerge;
  const setRecurringNightNoMerge = actions.setRecurringNightNoMerge;

  useEffect(() => {
    void flushPendingUsageLogs();
    void flushPendingSubmissions();
    const retryWhenOnline = () => void flushPendingSubmissions();
    window.addEventListener('online', retryWhenOnline);
    return () => window.removeEventListener('online', retryWhenOnline);
  }, []);

  useEffect(() => {
    if (appMode !== 'customer') return;
    setRecurringClosedNoMerge(true);
    setRecurringNightNoMerge(true);
  }, [appMode, setRecurringClosedNoMerge, setRecurringNightNoMerge]);

  const renderPreviewForFormat = useCallback(async (format: OutputFormat) => {
    setOutputFormat(format);
    try {
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const waitForRender = () => {
          const node = exportNodeRef.current;
          if (node?.dataset.outputFormat === format) {
            requestAnimationFrame(() => resolve());
            return;
          }
          attempts += 1;
          if (attempts >= 60) {
            reject(new Error(`${getOutputFormatMeta(format).label} 미리보기를 준비하지 못했습니다.`));
            return;
          }
          requestAnimationFrame(waitForRender);
        };
        requestAnimationFrame(waitForRender);
      });
      if (!exportNodeRef.current) throw new Error('달력 미리보기를 준비하지 못했습니다.');
      return await renderNodeAsPng(exportNodeRef.current, format);
    } finally {
      setOutputFormat('square');
    }
  }, []);

  const openClinicHoursSettings = useCallback(() => {
    setActiveSettingsPanel('hours');
    setExpandedSettingsGroup('schedule');
    requestAnimationFrame(() => {
      settingsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setNotionClinicHoursPageUrl('');
    setNotionClinicHoursSpecialNotes('');
    const applyMatchedHours = (clinicHoursText: string, lunchHours = '') => {
      const matchedHours = parseNotionClinicHours(clinicHoursText, lunchHours);
      if (matchedHours) setClinicHoursFromSheet(matchedHours);
      return Boolean(matchedHours);
    };

    const loadClinicHours = async () => {
      try {
        const notionQuery = new URLSearchParams({ hospitalName: hospital.name });
        const notionResponse = await fetch(`/api/notion-clinic-hours?${notionQuery}`, {
          signal: controller.signal,
        });
        const notionResult = notionResponse.ok ? await notionResponse.json() : null;
        if (appMode === 'internal' && notionResult?.found) {
          setNotionClinicHoursPageUrl(notionResult.pageUrl ?? '');
          setNotionClinicHoursSpecialNotes(notionResult.specialNotes ?? '');
        }
        if (
          notionResult?.found
          && applyMatchedHours(notionResult.clinicHours ?? '', notionResult.lunchHours ?? '')
        ) return;

        const sheetResponse = await fetch(`/api/google-sheet-clinic-hours?hospitalName=${encodeURIComponent(hospital.name)}`, {
          signal: controller.signal,
        });
        const sheetResult = sheetResponse.ok ? await sheetResponse.json() : null;
        if (sheetResult?.found) applyMatchedHours(sheetResult.clinicHours ?? '');
      } catch {
        // 외부 진료시간 조회 실패 시 부정확할 수 있는 기존 데이터로 자동 대체하지 않습니다.
      }
    };

    void loadClinicHours();
    return () => controller.abort();
  }, [appMode, hospital.name, setClinicHoursFromSheet]);

  useEffect(() => {
    let active = true;
    const prepareBackground = async () => {
      if (hospital.legacyBackgroundHospitalId) {
        await migrateCustomBackground(hospital.legacyBackgroundHospitalId, hospital.id);
        if (active) {
          onHospitalChange({
            ...hospital,
            legacyBackgroundHospitalId: undefined,
          });
        }
      }
      return loadCustomBackground(hospital.id);
    };
    void prepareBackground().then((file) => {
      if (!active || !file) return;
      const objectUrl = URL.createObjectURL(file);
      customBackgroundObjectUrlRef.current = objectUrl;
      setCustomBackgroundUrl(objectUrl);
      setCustomBackgroundFileName(file.name);
    }).catch(() => undefined);
    return () => {
      active = false;
      if (customBackgroundObjectUrlRef.current) URL.revokeObjectURL(customBackgroundObjectUrlRef.current);
    };
  }, [hospital, onHospitalChange]);

  const handleCustomBackgroundSelect = async (file: File) => {
    await saveCustomBackground(hospital.id, file);
    const nextUrl = URL.createObjectURL(file);
    if (customBackgroundObjectUrlRef.current) URL.revokeObjectURL(customBackgroundObjectUrlRef.current);
    customBackgroundObjectUrlRef.current = nextUrl;
    setCustomBackgroundUrl(nextUrl);
    setCustomBackgroundFileName(file.name);
  };

  const handleCustomBackgroundRemove = async () => {
    await deleteCustomBackground(hospital.id);
    if (customBackgroundObjectUrlRef.current) URL.revokeObjectURL(customBackgroundObjectUrlRef.current);
    customBackgroundObjectUrlRef.current = undefined;
    setCustomBackgroundUrl(undefined);
    setCustomBackgroundFileName(undefined);
  };

  const handleHospitalLogoChange = async (file?: File) => {
    const assetId = hospital.logoAssetId ?? hospital.id;
    if (!file) {
      const previousFile = await loadHospitalLogo(assetId);
      await deleteHospitalLogo(assetId);
      const nextHospital = {
        ...hospital,
        logoUrl: undefined,
        logoFileName: undefined,
        logoAssetId: undefined,
        logoUpdatedAt: new Date().toISOString(),
      };
      if (!saveHospitalInfo(nextHospital)) {
        if (previousFile) await saveHospitalLogo(assetId, previousFile);
        throw new Error('병원 정보를 저장하지 못했습니다.');
      }
      if (hospitalLogoObjectUrlRef.current) URL.revokeObjectURL(hospitalLogoObjectUrlRef.current);
      hospitalLogoObjectUrlRef.current = undefined;
      onHospitalChange(nextHospital);
      return;
    }

    const previousFile = await loadHospitalLogo(assetId);
    await saveHospitalLogo(assetId, file);
    const nextUrl = URL.createObjectURL(file);
    const nextHospital = {
      ...hospital,
      logoUrl: nextUrl,
      logoFileName: file.name,
      logoAssetId: assetId,
      logoUpdatedAt: new Date().toISOString(),
      displayMode: 'logo' as const,
    };
    if (!saveHospitalInfo(nextHospital)) {
      if (previousFile) await saveHospitalLogo(assetId, previousFile);
      else await deleteHospitalLogo(assetId);
      URL.revokeObjectURL(nextUrl);
      throw new Error('병원 정보를 저장하지 못했습니다.');
    }
    if (hospitalLogoObjectUrlRef.current) URL.revokeObjectURL(hospitalLogoObjectUrlRef.current);
    hospitalLogoObjectUrlRef.current = nextUrl;
    onHospitalChange(nextHospital);
  };

  const selectedResolvedSchedule = selectedDateKey ? resolvedByDate.get(selectedDateKey) : undefined;
  const selectedWeekday = selectedDateKey
    ? new Date(`${selectedDateKey}T00:00:00Z`).getUTCDay()
    : null;
  const selectedHasOverride = selectedDateKey
    ? formData.dateSchedules.some((schedule) => schedule.date === selectedDateKey)
    : false;
  const explicitDateKeys = useMemo(
    () => new Set(formData.dateSchedules.map((schedule) => schedule.date)),
    [formData.dateSchedules],
  );
  const selectedTemplate = formData.templateId
    ? TEMPLATES.find((template) => template.id === formData.templateId)
    : undefined;
  const currentDesignEdits = formData.designEditsByFormat?.[outputFormat] ?? {};

  useEffect(() => {
    if (appMode === 'internal' && availableTemplates.length === 0) {
      setTemplateModalOpen(false);
      setActiveSettingsPanel('background');
      setExpandedSettingsGroup('design');
      return;
    }
    const templateMatchesMonth = availableTemplates.some((template) => template.id === formData.templateId);
    if (!templateMatchesMonth) setTemplateModalOpen(true);
  }, [appMode, availableTemplates, formData.templateId]);

  useEffect(() => {
    if (
      appMode !== 'customer'
      || isTemplateModalOpen
      || !selectedTemplate
      || !shouldFocusSettingsAfterTemplateRef.current
    ) return;
    shouldFocusSettingsAfterTemplateRef.current = false;
    setActiveSettingsPanel('closed');
    setExpandedSettingsGroup('schedule');
    const focusTimer = window.setTimeout(() => {
      const panel = settingsPanelRef.current;
      if (!panel) return;
      panel.scrollIntoView({ behavior: 'auto', block: 'center' });
      window.requestAnimationFrame(() => {
        const settledPanel = settingsPanelRef.current;
        if (!settledPanel) return;
        const rect = settledPanel.getBoundingClientRect();
        setSettingsSpotlight({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          radiusX: rect.width / 2 + 64,
          radiusY: rect.height / 2 + 72,
        });
      });
    }, 100);
    spotlightClearTimerRef.current = window.setTimeout(() => setSettingsSpotlight(null), 3000);
    return () => {
      window.clearTimeout(focusTimer);
      if (spotlightClearTimerRef.current !== null) window.clearTimeout(spotlightClearTimerRef.current);
    };
  }, [appMode, isTemplateModalOpen, selectedTemplate]);

  const validateRecurringSettings = () => {
    const missing: string[] = [];
    if (formData.recurringClosedDays.length === 0 && !recurringClosedNone) missing.push('정기 휴진');
    if (formData.recurringNightDays.length === 0 && !recurringNightNone) missing.push('야간 진료');
    if (missing.length > 0) {
      setRecurringSettingsError(`${missing.join('과 ')} 요일을 선택하거나 ‘해당 없음’을 눌러 주세요.`);
      return false;
    }
    setRecurringSettingsError('');
    return true;
  };

  const focusCalendarAfterRecurringSettings = () => {
    if (!validateRecurringSettings()) return;
    const calendar = exportNodeRef.current?.querySelector<HTMLElement>('[data-edit-layer="calendar"]');
    if (!calendar) return;
    if (spotlightClearTimerRef.current !== null) window.clearTimeout(spotlightClearTimerRef.current);
    setSettingsSpotlight(null);
    calendar.scrollIntoView({ behavior: 'auto', block: 'center' });
    window.requestAnimationFrame(() => {
      const rect = calendar.getBoundingClientRect();
      setSettingsSpotlight({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        radiusX: rect.width / 2 + 44,
        radiusY: rect.height / 2 + 44,
      });
      spotlightClearTimerRef.current = window.setTimeout(() => setSettingsSpotlight(null), 3000);
    });
  };

  const panelContent: Partial<Record<SettingsPanel, ReactNode>> = {
    basic: (
      <>
        <h2 className={styles.cardTitle}>기본 설정</h2>
        <MonthSelector year={formData.year} month={formData.month} onChange={actions.setYearMonth} />
        <CalendarLabelSelector value={formData.calendarLabelStyle ?? 'korean'} onChange={actions.setCalendarLabelStyle} />
      </>
    ),
    closed: (
      <div className={styles.recurringSettings}>
        <h2 className={styles.cardTitle}>정기 일정 설정</h2>
        <p className={styles.cardHint}>매주 반복해서 쉬는 요일을 선택하세요.</p>
        <RecurringDaySelector
          selectedDays={formData.recurringClosedDays}
          onToggle={(day) => {
            setRecurringClosedNone(false);
            setRecurringSettingsError('');
            actions.toggleRecurringDay(day);
          }}
        />
        {appMode === 'customer' && (
          <button
            type="button"
            className={`${styles.recurringNoneButton} ${recurringClosedNone ? styles.recurringNoneButtonSelected : ''}`}
            aria-pressed={recurringClosedNone}
            onClick={() => {
              formData.recurringClosedDays.forEach(actions.toggleRecurringDay);
              setRecurringClosedNone((current) => !current);
              setRecurringSettingsError('');
            }}
          >
            정기 휴진 해당 없음
          </button>
        )}
        <h3 className={styles.recurringSectionTitle}>야간 진료</h3>
        <p className={styles.cardHint}>매주 반복해서 야간 진료하는 요일을 선택하세요.</p>
        <RecurringDaySelector
          selectedDays={formData.recurringNightDays}
          onToggle={(day) => {
            setRecurringNightNone(false);
            setRecurringSettingsError('');
            actions.toggleRecurringNightDay(day);
          }}
          ariaLabel="야간 진료 요일"
        />
        {appMode === 'customer' && (
          <button
            type="button"
            className={`${styles.recurringNoneButton} ${recurringNightNone ? styles.recurringNoneButtonSelected : ''}`}
            aria-pressed={recurringNightNone}
            onClick={() => {
              formData.recurringNightDays.forEach(actions.toggleRecurringNightDay);
              setRecurringNightNone((current) => !current);
              setRecurringSettingsError('');
            }}
          >
            야간 진료 해당 없음
          </button>
        )}
        {appMode === 'customer' && (
          <>
            {recurringSettingsError && (
              <p className={styles.recurringSettingsError} role="alert">{recurringSettingsError}</p>
            )}
            <button
              type="button"
              className={styles.recurringNextButton}
              onClick={focusCalendarAfterRecurringSettings}
            >
              설정 완료 · 달력에서 날짜별 일정 추가
            </button>
          </>
        )}
      </div>
    ),
    vacation: (
      <>
        <h2 className={styles.cardTitle}>휴가 설정</h2>
        <VacationRangeField
          year={formData.year}
          month={formData.month}
          start={formData.vacationStart}
          end={formData.vacationEnd}
          color={formData.vacationBadgeColor}
          noMerge={formData.vacationNoMerge ?? false}
          onChange={actions.setVacationRange}
          onColorChange={actions.setVacationBadgeColor}
          onNoMergeChange={actions.setVacationNoMerge}
        />
      </>
    ),
    hours: (
      <>
        <h2 className={styles.cardTitle}>진료시간</h2>
        <p className={styles.cardHint}>A4와 DID 이미지의 제목 아래에 표시됩니다.</p>
        {outputFormat === 'square' && appMode === 'internal' ? (
          <div className={styles.unsupportedNotice}>
            <strong>이 이미지 규격에서는 진료시간이 적용되지 않습니다.</strong>
            <span>진료시간을 표시하려면 A4 또는 DID 규격을 선택해 주세요.</span>
          </div>
        ) : (
          <ClinicHoursEditor
            value={getClinicHoursWithExample(formData.clinicHours)}
            onChange={actions.setClinicHours}
            showConfirmationAction={appMode === 'customer'}
            onConfirm={() => actions.setClinicHours({
              ...getClinicHoursWithExample(formData.clinicHours),
              confirmed: true,
            })}
          />
        )}
      </>
    ),
  };

  const settingsContent = appMode === 'customer' ? (
      <nav className={`${styles.settingsNav} ${styles.settingsNavSingle}`} aria-label="진료 일정 설정">
        <button
          type="button"
          className={styles.settingsNavActive}
          aria-current="page"
          onClick={() => {
            setActiveSettingsPanel('closed');
            setExpandedSettingsGroup('schedule');
          }}
        >
          정기 설정
        </button>
      </nav>
  ) : (
      <nav className={styles.settingsNav} aria-label="일정 이미지 설정">
        {visibleSettingsGroups.map((group) => (
          <div className={styles.settingsGroup} key={group.label}>
            <button
              type="button"
              className={styles.settingsGroupTrigger}
              aria-expanded={expandedSettingsGroup === group.id}
              aria-controls={`settings-group-${group.id}`}
              onClick={() => {
                if (expandedSettingsGroup === group.id) return;
                setExpandedSettingsGroup(group.id);
                setActiveSettingsPanel(group.items[0].id);
              }}
            >
              <span>{group.label}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20">
                <path d="m5 7.5 5 5 5-5" />
              </svg>
            </button>
            {expandedSettingsGroup === group.id && (
            <div id={`settings-group-${group.id}`} className={styles.settingsGroupItems}>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={activeSettingsPanel === item.id ? styles.settingsNavActive : undefined}
                aria-current={activeSettingsPanel === item.id ? 'page' : undefined}
                onClick={() => {
                  setActiveSettingsPanel(item.id);
                  setExpandedSettingsGroup(group.id);
                }}
              >
                {item.label}
              </button>
            ))}
            </div>
            )}
          </div>
        ))}
      </nav>
  );
  const activeSettingsGroup = SETTINGS_GROUPS.find((group) =>
    group.items.some((item) => item.id === activeSettingsPanel),
  )?.id;
  const isActiveSettingsPanelVisible = expandedSettingsGroup === activeSettingsGroup;
  const visibleActiveEditor = isActiveSettingsPanelVisible
    ? activeSettingsPanel === 'background'
      ? 'background'
      : activeSettingsPanel === 'elements'
        ? 'elements'
        : null
    : null;
  const standardPanelContent = isActiveSettingsPanelVisible
    && activeSettingsPanel !== 'background'
    && activeSettingsPanel !== 'elements'
    ? (
      <section
        ref={settingsPanelRef}
        className={`${styles.card} ${styles.settingsPanel}`}
      >
        {panelContent[activeSettingsPanel]}
      </section>
    )
    : null;

  const previewHeader = (
    <>
      <div className={styles.previewTools}>
        <div>
          <p className={styles.previewLabel}>실시간 미리보기</p>
          {appMode === 'customer' && (
            <p className={styles.previewSimpleHint}>
              날짜별로 다른 일정이 있다면 달력에서 해당 날짜를 눌러 설정해 주세요.
            </p>
          )}
        </div>
        <div className={styles.previewActions}>
          {appMode === 'customer' && (
            <button type="button" className={styles.previewDesignButton} onClick={onOpenCustomerGuide}>
              사용 방법
            </button>
          )}
          {availableTemplates.length > 0 && (
            <button type="button" className={styles.previewDesignButton} onClick={() => setTemplateModalOpen(true)}>
              템플릿 변경
            </button>
          )}
        </div>
      </div>
      {appMode === 'internal' && <section className={styles.formatSection}>
        <button
          type="button"
          className={styles.formatSectionTrigger}
          aria-expanded={isFormatSectionExpanded}
          aria-controls="output-format-options"
          onClick={() => setFormatSectionExpanded((current) => !current)}
        >
          <span>
            <strong>이미지 규격</strong>
            <small>{getOutputFormatMeta(outputFormat).label}</small>
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </button>
        {isFormatSectionExpanded && (
          <div id="output-format-options" className={styles.formatSectionContent}>
            <p className={styles.cardHint}>
              제작할 이미지의 크기와 용도를 선택하세요.
            </p>
            <p className={styles.formatNotice}>
              미리보기는 화면에 맞춰 축소되며, PNG 저장 시 선택한 실제 픽셀 크기로 출력됩니다.
            </p>
            <OutputFormatSelector
              value={outputFormat}
              onChange={setOutputFormat}
            />
          </div>
        )}
      </section>}
    </>
  );

  const canUseProductionTools = Boolean(selectedTemplate)
    || (appMode === 'internal' && availableTemplates.length === 0);
  const previewFooter = canUseProductionTools ? (
    <div className={styles.downloadActions}>
      {appMode === 'internal' && (
        <ExportImageButton
          key={outputFormat}
          nodeRef={exportNodeRef}
          hospitalId={hospital.id}
          hospitalName={hospital.name}
          directorName={hospital.directorName}
          templateId={formData.templateId}
          year={formData.year}
          month={formData.month}
          formData={formData}
          resolvedSchedule={resolvedSchedule}
          fontId={(formData.fontId as FontId) ?? DEFAULT_FONT_ID}
          disabled={false}
          outputFormat={outputFormat}
          requiresClinicHoursConfirmation={outputFormat !== 'square' && !formData.clinicHours?.confirmed}
          onClinicHoursConfirm={() => actions.setClinicHours({
            ...getClinicHoursWithExample(formData.clinicHours),
            confirmed: true,
          })}
        />
      )}
      {appMode === 'customer' && (
        <button
          type="button"
          className={`${styles.secondaryButton} ${styles.customerSubmitButton}`}
          onClick={() => {
            if (!validateRecurringSettings()) {
              setActiveSettingsPanel('closed');
              setExpandedSettingsGroup('schedule');
              requestAnimationFrame(() => settingsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
              return;
            }
            setCustomModalOpen(true);
          }}
        >
          진료일정 제출하기
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className={styles.page}>
      <header className={styles.hero} style={{ '--hero-accent': hospital.primaryColor } as CSSProperties}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>{hospital.name} 원장님, 안녕하세요!</h1>
          <p className={styles.heroSubtitle}>
            {appMode === 'customer'
              ? '휴진일과 진료 일정을 설정하고, 완성된 시안을 확인한 뒤 제출해 주세요.'
              : '휴진일과 진료 일정을 선택하면 진료안내 이미지를 실시간으로 만들 수 있어요.'}
          </p>
          <div className={styles.heroActions}>
            <span
              className={`${styles.saveStatus} ${saveStatus === 'error' ? styles.saveStatusError : ''}`}
              role="status"
              aria-live="polite"
            >
              {saveStatus === 'saving' ? '저장 중…' : saveStatus === 'error' ? '저장 실패' : '자동 저장됨'}
            </span>
            {appMode === 'internal' && (
              <div className={styles.heroButtonRow}>
                {notionClinicHoursPageUrl && (
                  <a
                    className={styles.heroNotionButton}
                    href={notionClinicHoursPageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    노션 DB 열기 ↗
                    {notionClinicHoursSpecialNotes && (
                      <span title={notionClinicHoursSpecialNotes}>특이사항</span>
                    )}
                  </a>
                )}
                <button
                  type="button"
                  className={styles.heroChangeButton}
                  onClick={() => setHospitalSwitchConfirmOpen(true)}
                >
                  다른 병원으로 전환
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {settingsSpotlight && (
        <div
          className={styles.settingsSpotlightBackdrop}
          aria-hidden="true"
          style={{
            '--settings-spotlight-x': `${settingsSpotlight.x}px`,
            '--settings-spotlight-y': `${settingsSpotlight.y}px`,
            '--settings-spotlight-radius-x': `${settingsSpotlight.radiusX}px`,
            '--settings-spotlight-radius-y': `${settingsSpotlight.radiusY}px`,
          } as CSSProperties}
        />
      )}

      <main className={styles.container}>
        {canUseProductionTools ? (
          <SchedulePreview
            ref={exportNodeRef}
            hospital={hospital}
            formData={formData}
            designEdits={currentDesignEdits}
            calendarMatrix={calendarMatrix}
            resolvedByDate={resolvedByDate}
            onDateClick={setSelectedDateKey}
            outputFormat={outputFormat}
            onDesignEditsChange={(edits) => actions.setDesignEdits(outputFormat, edits)}
            onSecondarySubtitleEnabledChange={actions.setSecondarySubtitleEnabled}
            onSecondarySubtitleTextChange={actions.setSecondarySubtitleText}
            customBackgroundUrl={customBackgroundUrl}
            customBackgroundFileName={customBackgroundFileName}
            useTransparentTemplateBackground={!selectedTemplate}
            onCustomBackgroundSelect={handleCustomBackgroundSelect}
            onCustomBackgroundRemove={handleCustomBackgroundRemove}
            onResetSchedule={() => {
              actions.resetSchedule();
              if (appMode === 'customer') {
                setRecurringClosedNoMerge(true);
                setRecurringNightNoMerge(true);
              }
            }}
            onResetDesign={async () => {
              await handleCustomBackgroundRemove();
              actions.resetDesign();
            }}
            onResetAll={async () => {
              await handleCustomBackgroundRemove();
              actions.resetAll();
              setOutputFormat('square');
              setTemplateModalOpen(true);
            }}
            activeEditor={visibleActiveEditor}
            settingsPanelVisible={isActiveSettingsPanelVisible}
            settingsContent={settingsContent}
            standardPanelContent={standardPanelContent}
            hospitalLogoEditor={(
              <LogoUploadField
                logoUrl={hospital.logoUrl}
                logoFileName={hospital.logoFileName}
                onChange={handleHospitalLogoChange}
              />
            )}
            titleStyleEditor={(
              <TitleTextStyleSelector
                value={formData.titleTextStyle ?? 'filled'}
                onChange={actions.setTitleTextStyle}
              />
            )}
            previewHeader={previewHeader}
            previewFooter={previewFooter}
            showMobileSettingsFooter={appMode === 'customer'}
            onOpenElements={() => {
              setActiveSettingsPanel('elements');
              setExpandedSettingsGroup('design');
            }}
            onOpenClinicHours={openClinicHoursSettings}
            requireClinicHoursConfirmation={false}
            designEditingEnabled={appMode === 'internal'}
            onHospitalDisplayModeChange={(displayMode) => onHospitalChange({ ...hospital, displayMode })}
          />
        ) : (
          <div className={styles.previewDisabled}>템플릿을 먼저 선택해 주세요.</div>
        )}
      </main>

      {selectedDateKey && selectedResolvedSchedule && (
        <DateScheduleModal
          dateKey={selectedDateKey}
          currentSchedule={selectedResolvedSchedule}
          hasOverride={selectedHasOverride}
          outputFormat={outputFormat}
          isAutomaticHoliday={
            !selectedHasOverride
            && selectedResolvedSchedule.type === 'custom'
            && Boolean(selectedResolvedSchedule.label)
            && Boolean(selectedResolvedSchedule.additionalSchedules?.some((entry) => entry.type === 'closed'))
          }
          hiddenRecurringTypes={selectedWeekday === null ? [] : [
            ...(formData.recurringClosedDays.includes(selectedWeekday) ? ['closed' as const] : []),
            ...(formData.recurringNightDays.includes(selectedWeekday) ? ['night' as const] : []),
          ]}
          resolvedByDate={resolvedByDate}
          explicitDateKeys={explicitDateKeys}
          onSave={actions.setDateSchedule}
          onClear={() => actions.clearDateSchedule(selectedDateKey)}
          onClearDate={actions.clearDateSchedule}
          onClose={() => setSelectedDateKey(null)}
          showClearAllAction={appMode === 'internal'}
          allowBadgeTypographyEditing={appMode === 'internal'}
          allowBadgeStyleEditing={appMode === 'internal'}
          allowRangeMergeEditing={appMode === 'internal'}
        />
      )}

      {isHospitalSwitchConfirmOpen && (
        <Modal title="다른 병원으로 전환" onClose={() => setHospitalSwitchConfirmOpen(false)}>
          <div className={styles.switchConfirmContent}>
            <p><strong>{hospital.name} 작업을 마치고 다른 병원으로 전환할까요?</strong></p>
            {saveStatus === 'error' ? (
              <p className={styles.switchSaveError} role="alert">
                현재 변경사항을 브라우저에 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해 주세요.
              </p>
            ) : (
              <p>
                현재 일정과 디자인은 이 브라우저에 저장되어 있으며, 전환해도 삭제되지 않습니다.
              </p>
            )}
            <p className={styles.switchStorageHint}>
              저장 내용은 다른 브라우저나 기기에 자동으로 동기화되지 않습니다.
            </p>
            <div className={styles.switchConfirmActions}>
              <button type="button" onClick={() => setHospitalSwitchConfirmOpen(false)}>취소</button>
              <button
                type="button"
                className={styles.switchConfirmPrimary}
                onClick={onHospitalReset}
                disabled={saveStatus === 'error'}
              >
                다른 병원으로 전환
              </button>
            </div>
          </div>
        </Modal>
      )}

      {isTemplateModalOpen && (
        <Modal
          title={availableTemplates.length > 0
            ? `${formData.year}년 ${formData.month}월 시안을 선택해 주세요`
            : `${formData.year}년 제작 월을 선택해 주세요`}
          onClose={() => setTemplateModalOpen(false)}
          closable={hasSelectedTemplate || availableTemplates.length === 0}
          panelClassName={styles.templateSelectModal}
        >
          <MonthSelector
            year={formData.year}
            month={formData.month}
            availableMonths={appMode === 'internal' ? [8, 9, 10, 11, 12] : [8, 9]}
            onChange={(year, month) => {
              actions.setYearMonth(year, month);
              const hasTemplatesForMonth = TEMPLATES.some((template) => template.month === month);
              if (!hasTemplatesForMonth) {
                setTemplateModalOpen(false);
                setActiveSettingsPanel('background');
                setExpandedSettingsGroup('design');
              }
            }}
          />
          {availableTemplates.length > 0 && (
            <div className={styles.templateListSpacing}>
              <TemplateSelector
                month={formData.month}
                selectedId={formData.templateId}
                onSelect={(templateId) => {
                  if (appMode === 'customer' && !hasSelectedTemplate) {
                    shouldFocusSettingsAfterTemplateRef.current = true;
                  }
                  actions.setTemplateId(templateId);
                  setTemplateModalOpen(false);
                }}
              />
            </div>
          )}
        </Modal>
      )}

      {appMode === 'customer' && isCustomModalOpen && (
        <CustomDesignRequestModal
          submissionMode="schedule"
          hospital={hospital}
          formData={formData}
          resolvedSchedule={resolvedSchedule}
          onNextMonthEventChange={actions.setNextMonthEvent}
          onCalendarMustIncludeChange={actions.setCalendarMustInclude}
          onOutputSizeChange={actions.setOutputSize}
          previewNodeRef={exportNodeRef}
          outputFormat={outputFormat}
          renderPreviewForFormat={renderPreviewForFormat}
          onClose={() => setCustomModalOpen(false)}
        />
      )}
    </div>
  );
}
