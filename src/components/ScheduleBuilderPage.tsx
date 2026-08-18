import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { HospitalInfo } from '../types/schedule';
import { TEMPLATES } from '../types/schedule';
import { DEFAULT_FONT_ID, type FontId } from '../types/font';
import { useScheduleBuilder } from '../hooks/useScheduleBuilder';
import HospitalIntakeForm from './HospitalIntakeForm';
import LogoUploadField from './LogoUploadField';
import MonthSelector from './MonthSelector';
import CalendarLabelSelector from './CalendarLabelSelector';
import RecurringDaySelector from './RecurringDaySelector';
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
import ClinicHoursEditor from './ClinicHoursEditor';
import { deleteCustomBackground, loadCustomBackground, migrateCustomBackground, saveCustomBackground } from '../utils/backgroundStorage';
import { removeHospitalData, removeHospitalInfo, saveHospitalInfo } from '../utils/storageUtils';
import { getClinicHoursWithExample, parseNotionClinicHours } from '../utils/clinicHoursUtils';
import { flushPendingUsageLogs } from '../utils/usageLogUtils';
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
      { id: 'closed', label: '정기 휴진' },
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

  const handleHospitalChange = useCallback((nextHospital: HospitalInfo) => {
    saveHospitalInfo(nextHospital);
    setHospital(nextHospital);
  }, []);

  const handleHospitalReset = useCallback(() => {
    removeHospitalInfo();
    setHospital(null);
  }, []);

  const handleHospitalDelete = useCallback(async (target: HospitalInfo) => {
    try {
      await deleteCustomBackground(target.id);
      return removeHospitalData(target.id);
    } catch {
      return false;
    }
  }, []);

  if (!hospital) {
    return (
      <HospitalIntakeForm
        onSubmit={handleHospitalChange}
        onDeleteHospital={handleHospitalDelete}
        showRecentHospitals={false}
      />
    );
  }
  return (
    <ScheduleBuilderContent
      appMode={appMode}
      hospital={hospital}
      onHospitalChange={handleHospitalChange}
      onHospitalReset={handleHospitalReset}
    />
  );
}

function ScheduleBuilderContent({
  appMode,
  hospital,
  onHospitalChange,
  onHospitalReset,
}: {
  appMode: 'customer' | 'internal';
  hospital: HospitalInfo;
  onHospitalChange: (hospital: HospitalInfo) => void;
  onHospitalReset: () => void;
}) {
  const { formData, saveStatus, resolvedSchedule, resolvedByDate, calendarMatrix, actions } = useScheduleBuilder(hospital.id);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isCustomModalOpen, setCustomModalOpen] = useState(false);
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(() => formData.templateId === null);
  const availableTemplates = useMemo(
    () => TEMPLATES.filter((template) => template.month === formData.month),
    [formData.month],
  );
  const hasSelectedTemplate = availableTemplates.some((template) => template.id === formData.templateId);
  const [isHospitalSwitchConfirmOpen, setHospitalSwitchConfirmOpen] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('square');
  const [isFormatSectionExpanded, setFormatSectionExpanded] = useState(true);
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<SettingsPanel>('basic');
  const [expandedSettingsGroup, setExpandedSettingsGroup] = useState<SettingsGroupId>('schedule');
  const visibleSettingsGroups = appMode === 'customer'
    ? SETTINGS_GROUPS.filter((group) => group.id !== 'design')
    : SETTINGS_GROUPS;
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string>();
  const [customBackgroundFileName, setCustomBackgroundFileName] = useState<string>();
  const customBackgroundObjectUrlRef = useRef<string | undefined>(undefined);
  const exportNodeRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLElement>(null);
  const setClinicHours = actions.setClinicHours;

  useEffect(() => {
    void flushPendingUsageLogs();
  }, []);

  useEffect(() => {
    if (appMode === 'customer' && outputFormat !== 'square') {
      setOutputFormat('square');
    }
  }, [appMode, outputFormat]);

  const openClinicHoursSettings = useCallback(() => {
    setActiveSettingsPanel('hours');
    setExpandedSettingsGroup('schedule');
    requestAnimationFrame(() => {
      settingsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/notion-clinic-hours?hospitalName=${encodeURIComponent(hospital.name)}`, {
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() : null)
      .then((result) => {
        const notionHours = result?.found
          ? parseNotionClinicHours(result.clinicHours ?? '', result.lunchHours ?? '')
          : null;
        if (notionHours) setClinicHours(notionHours);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [formData.month, formData.year, hospital.name, setClinicHours]);

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

  const selectedResolvedSchedule = selectedDateKey ? resolvedByDate.get(selectedDateKey) : undefined;
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
    const templateMatchesMonth = availableTemplates.some((template) => template.id === formData.templateId);
    if (!templateMatchesMonth) setTemplateModalOpen(true);
  }, [availableTemplates, formData.templateId]);

  const panelContent: Partial<Record<SettingsPanel, ReactNode>> = {
    basic: (
      <>
        <h2 className={styles.cardTitle}>기본 설정</h2>
        <MonthSelector year={formData.year} month={formData.month} onChange={actions.setYearMonth} />
        <CalendarLabelSelector value={formData.calendarLabelStyle ?? 'korean'} onChange={actions.setCalendarLabelStyle} />
      </>
    ),
    closed: (
      <>
        <h2 className={styles.cardTitle}>정기 휴진 설정</h2>
        <p className={styles.cardHint}>매주 반복해서 쉬는 요일을 선택하세요.</p>
        <RecurringDaySelector selectedDays={formData.recurringClosedDays} onToggle={actions.toggleRecurringDay} />
      </>
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

  const settingsContent = (
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
    ? <section ref={settingsPanelRef} className={`${styles.card} ${styles.settingsPanel}`}>{panelContent[activeSettingsPanel]}</section>
    : null;

  const previewHeader = (
    <>
      <div className={styles.previewTools}>
        <div>
          <p className={styles.previewLabel}>실시간 미리보기</p>
          <p className={styles.previewEditHint}>
            <span aria-hidden="true">✦</span>
            <strong>날짜별 일정 편집</strong>
            달력에서 날짜를 눌러 휴진·공휴일 진료·야간 진료를 설정하세요.
          </p>
        </div>
        <div className={styles.previewActions}>
          <button type="button" className={styles.previewDesignButton} onClick={() => setTemplateModalOpen(true)}>
            템플릿 변경
          </button>
        </div>
      </div>
      <section className={styles.formatSection}>
        <button
          type="button"
          className={styles.formatSectionTrigger}
          aria-expanded={isFormatSectionExpanded}
          aria-controls="output-format-options"
          onClick={() => setFormatSectionExpanded((current) => !current)}
        >
          <span>
            <strong>이미지 규격</strong>
            <small>
              {appMode === 'customer'
                ? `${(formData.outputSize ?? []).length}개 선택`
                : getOutputFormatMeta(outputFormat).label}
            </small>
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </button>
        {isFormatSectionExpanded && (
          <div id="output-format-options" className={styles.formatSectionContent}>
            <p className={styles.cardHint}>
              {appMode === 'customer'
                ? '제작을 원하는 규격을 모두 선택하세요. 복수 선택할 수 있습니다.'
                : '제작할 이미지의 크기와 용도를 선택하세요.'}
            </p>
            <p className={styles.formatNotice}>
              {appMode === 'customer'
                ? '미리보기는 인스타 팝업 규격으로 고정되며, 선택한 규격은 제출 데이터에 반영됩니다.'
                : '미리보기는 화면에 맞춰 축소되며, PNG 저장 시 선택한 실제 픽셀 크기로 출력됩니다.'}
            </p>
            <OutputFormatSelector
              value={outputFormat}
              onChange={setOutputFormat}
              multipleValue={appMode === 'customer' ? formData.outputSize ?? [] : undefined}
              onMultipleChange={appMode === 'customer' ? actions.setOutputSize : undefined}
            />
          </div>
        )}
      </section>
    </>
  );

  const previewFooter = selectedTemplate ? (
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
          className={styles.secondaryButton}
          onClick={() => {
            if (!formData.clinicHours?.confirmed) {
              openClinicHoursSettings();
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
            휴진일과 진료 일정을 선택하면 진료안내 이미지를 실시간으로 만들 수 있어요.
          </p>
          <div className={styles.heroActions}>
            <span
              className={`${styles.saveStatus} ${saveStatus === 'error' ? styles.saveStatusError : ''}`}
              role="status"
              aria-live="polite"
            >
              {saveStatus === 'saving' ? '저장 중…' : saveStatus === 'error' ? '저장 실패' : '자동 저장됨'}
            </span>
            <button
              type="button"
              className={styles.heroChangeButton}
              onClick={() => setHospitalSwitchConfirmOpen(true)}
            >
              다른 병원으로 전환
            </button>
          </div>
        </div>
      </header>

      <main className={styles.container}>
        {selectedTemplate ? (
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
            customBackgroundUrl={customBackgroundUrl}
            customBackgroundFileName={customBackgroundFileName}
            onCustomBackgroundSelect={handleCustomBackgroundSelect}
            onCustomBackgroundRemove={handleCustomBackgroundRemove}
            onResetSchedule={actions.resetSchedule}
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
                onChange={(logoUrl, logoFileName) => onHospitalChange({ ...hospital, logoUrl, logoFileName })}
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
            onOpenElements={() => {
              setActiveSettingsPanel('elements');
              setExpandedSettingsGroup('design');
            }}
            onOpenClinicHours={openClinicHoursSettings}
            requireClinicHoursConfirmation={appMode === 'customer'}
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
            && selectedResolvedSchedule.type === 'closed'
            && Boolean(selectedResolvedSchedule.label)
          }
          resolvedByDate={resolvedByDate}
          explicitDateKeys={explicitDateKeys}
          onSave={actions.setDateSchedule}
          onClear={() => actions.clearDateSchedule(selectedDateKey)}
          onClearDate={actions.clearDateSchedule}
          onClose={() => setSelectedDateKey(null)}
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
          title={`${formData.year}년 ${formData.month}월 시안을 선택해 주세요`}
          onClose={() => setTemplateModalOpen(false)}
          closable={hasSelectedTemplate}
          panelClassName={styles.templateSelectModal}
        >
          <MonthSelector
            year={formData.year}
            month={formData.month}
            availableMonths={[8, 9]}
            onChange={actions.setYearMonth}
          />
          <div className={styles.templateListSpacing}>
            <TemplateSelector
              month={formData.month}
              selectedId={formData.templateId}
              onSelect={(templateId) => {
                actions.setTemplateId(templateId);
                setTemplateModalOpen(false);
              }}
            />
          </div>
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
          onClose={() => setCustomModalOpen(false)}
        />
      )}
    </div>
  );
}
