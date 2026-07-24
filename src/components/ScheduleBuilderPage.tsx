import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
import FontSelector from './FontSelector';
import TitleTextStyleSelector from './TitleTextStyleSelector';
import SchedulePreview from './SchedulePreview';
import ExportImageButton from './ExportImageButton';
import CustomDesignRequestModal from './CustomDesignRequestModal';
import Modal from './Modal';
import OutputFormatSelector from './OutputFormatSelector';
import type { OutputFormat } from '../types/outputFormat';
import ClinicHoursEditor from './ClinicHoursEditor';
import { deleteCustomBackground, loadCustomBackground, saveCustomBackground } from '../utils/backgroundStorage';
import { loadHospitalInfo, removeHospitalInfo, saveHospitalInfo } from '../utils/storageUtils';
import styles from './ScheduleBuilderPage.module.css';

type SettingsPanel =
  | 'basic' | 'closed' | 'vacation' | 'hours'
  | 'background' | 'elements' | 'title' | 'font' | 'logo';

const SETTINGS_GROUPS: { label: string; items: { id: SettingsPanel; label: string }[] }[] = [
  {
    label: '일정 설정',
    items: [
      { id: 'basic', label: '기본 설정' },
      { id: 'closed', label: '정기 휴진' },
      { id: 'vacation', label: '휴가 설정' },
      { id: 'hours', label: '진료시간' },
    ],
  },
  {
    label: '디자인 설정',
    items: [
      { id: 'background', label: '배경 이미지' },
      { id: 'elements', label: '요소 편집' },
      { id: 'title', label: '제목 스타일' },
      { id: 'font', label: '폰트 선택' },
      { id: 'logo', label: '병원 로고' },
    ],
  },
];

export default function ScheduleBuilderPage() {
  const [hospital, setHospital] = useState<HospitalInfo | null>(() => loadHospitalInfo());

  const handleHospitalChange = (nextHospital: HospitalInfo) => {
    saveHospitalInfo(nextHospital);
    setHospital(nextHospital);
  };

  const handleHospitalReset = () => {
    removeHospitalInfo();
    setHospital(null);
  };

  if (!hospital) return <HospitalIntakeForm onSubmit={handleHospitalChange} />;
  return (
    <ScheduleBuilderContent
      hospital={hospital}
      onHospitalChange={handleHospitalChange}
      onHospitalReset={handleHospitalReset}
    />
  );
}

function ScheduleBuilderContent({
  hospital,
  onHospitalChange,
  onHospitalReset,
}: {
  hospital: HospitalInfo;
  onHospitalChange: (hospital: HospitalInfo) => void;
  onHospitalReset: () => void;
}) {
  const { formData, resolvedSchedule, resolvedByDate, calendarMatrix, actions } = useScheduleBuilder(hospital.id);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isCustomModalOpen, setCustomModalOpen] = useState(false);
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(() => formData.templateId === null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('square');
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<SettingsPanel>('basic');
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string>();
  const [customBackgroundFileName, setCustomBackgroundFileName] = useState<string>();
  const customBackgroundObjectUrlRef = useRef<string | undefined>(undefined);
  const exportNodeRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    void loadCustomBackground(hospital.id).then((file) => {
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
  }, [hospital.id]);

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
  const selectedTemplate = formData.templateId
    ? TEMPLATES.find((template) => template.id === formData.templateId)
    : undefined;

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
          start={formData.vacationStart}
          end={formData.vacationEnd}
          onChange={actions.setVacationRange}
        />
      </>
    ),
    hours: (
      <>
        <h2 className={styles.cardTitle}>진료시간</h2>
        <p className={styles.cardHint}>A4와 DID 이미지의 제목 아래에 표시됩니다.</p>
        <ClinicHoursEditor
          value={formData.clinicHours ?? { rows: [], lunchStart: '', lunchEnd: '', note: '' }}
          onChange={actions.setClinicHours}
        />
      </>
    ),
    title: (
      <>
        <h2 className={styles.cardTitle}>제목 글자 스타일</h2>
        <TitleTextStyleSelector value={formData.titleTextStyle ?? 'outline'} onChange={actions.setTitleTextStyle} />
      </>
    ),
    font: (
      <>
        <h2 className={styles.cardTitle}>폰트 선택</h2>
        <FontSelector selectedId={(formData.fontId as FontId) ?? DEFAULT_FONT_ID} onSelect={actions.setFontId} />
      </>
    ),
    logo: (
      <>
        <h2 className={styles.cardTitle}>병원 로고</h2>
        <LogoUploadField
          logoUrl={hospital.logoUrl}
          onChange={(logoUrl) => onHospitalChange({ ...hospital, logoUrl })}
        />
      </>
    ),
  };

  const settingsContent = (
      <nav className={styles.settingsNav} aria-label="일정 이미지 설정">
        {SETTINGS_GROUPS.map((group) => (
          <div className={styles.settingsGroup} key={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={activeSettingsPanel === item.id ? styles.settingsNavActive : undefined}
                aria-current={activeSettingsPanel === item.id ? 'page' : undefined}
                onClick={() => setActiveSettingsPanel(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
  );
  const standardPanelContent = activeSettingsPanel !== 'background' && activeSettingsPanel !== 'elements'
    ? <section ref={settingsPanelRef} className={`${styles.card} ${styles.settingsPanel}`}>{panelContent[activeSettingsPanel]}</section>
    : null;

  const previewHeader = (
    <>
      <div className={styles.previewTools}>
        <div>
          <p className={styles.previewLabel}>실시간 미리보기</p>
          <p className={styles.previewEditHint}>달력의 날짜를 선택해 일정을 설정할 수 있어요.</p>
        </div>
        <div className={styles.previewActions}>
          <button type="button" className={styles.previewDesignButton} onClick={() => setTemplateModalOpen(true)}>
            템플릿 변경
          </button>
        </div>
      </div>
      <section className={styles.formatSection}>
        <h2 className={styles.cardTitle}>이미지 규격</h2>
        <p className={styles.cardHint}>제작할 이미지의 크기와 용도를 선택하세요.</p>
        <OutputFormatSelector value={outputFormat} onChange={setOutputFormat} />
      </section>
    </>
  );

  const previewFooter = selectedTemplate ? (
    <div className={styles.downloadActions}>
      <ExportImageButton
        nodeRef={exportNodeRef}
        hospitalName={hospital.name}
        year={formData.year}
        month={formData.month}
        fontId={(formData.fontId as FontId) ?? DEFAULT_FONT_ID}
        disabled={false}
        outputFormat={outputFormat}
      />
      <button type="button" className={styles.secondaryButton} onClick={() => setCustomModalOpen(true)}>
        맞춤 디자인 요청하기
      </button>
    </div>
  ) : null;

  return (
    <div className={styles.page}>
      <header className={styles.hero} style={{ '--hero-accent': hospital.primaryColor } as CSSProperties}>
        <div className={styles.heroInner}>
          <span className={styles.heroBadge}>진료일정 이미지 자동 생성</span>
          <h1 className={styles.heroTitle}>{hospital.name} 원장님, 안녕하세요!</h1>
          <p className={styles.heroSubtitle}>
            휴진일과 진료 일정을 선택하면 진료안내 이미지를 실시간으로 만들 수 있어요.
          </p>
          <button type="button" className={styles.heroChangeButton} onClick={onHospitalReset}>
            병원 변경
          </button>
        </div>
      </header>

      <main className={styles.container}>
        {selectedTemplate ? (
          <SchedulePreview
            ref={exportNodeRef}
            hospital={hospital}
            formData={formData}
            calendarMatrix={calendarMatrix}
            resolvedByDate={resolvedByDate}
            onDateClick={setSelectedDateKey}
            outputFormat={outputFormat}
            onDesignEditsChange={actions.setDesignEdits}
            customBackgroundUrl={customBackgroundUrl}
            customBackgroundFileName={customBackgroundFileName}
            onCustomBackgroundSelect={handleCustomBackgroundSelect}
            onCustomBackgroundRemove={handleCustomBackgroundRemove}
            onResetAllDesign={async () => {
              actions.reset();
              await handleCustomBackgroundRemove();
            }}
            activeEditor={activeSettingsPanel === 'background' ? 'background' : activeSettingsPanel === 'elements' ? 'elements' : null}
            settingsContent={settingsContent}
            standardPanelContent={standardPanelContent}
            previewHeader={previewHeader}
            previewFooter={previewFooter}
            onOpenClinicHours={() => {
              setActiveSettingsPanel('hours');
              requestAnimationFrame(() => {
                settingsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              });
            }}
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
          onSave={actions.setDateSchedule}
          onClear={() => actions.clearDateSchedule(selectedDateKey)}
          onClose={() => setSelectedDateKey(null)}
        />
      )}

      {isTemplateModalOpen && (
        <Modal
          title="시안을 선택해 주세요"
          onClose={() => setTemplateModalOpen(false)}
          closable={formData.templateId !== null}
          panelClassName={styles.templateSelectModal}
        >
          <TemplateSelector
            selectedId={formData.templateId}
            onSelect={(templateId) => {
              actions.setTemplateId(templateId);
              setTemplateModalOpen(false);
            }}
          />
        </Modal>
      )}

      {isCustomModalOpen && (
        <CustomDesignRequestModal
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
