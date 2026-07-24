import { useRef, useState, type CSSProperties } from 'react';
import type { HospitalInfo } from '../types/schedule';
import { TEMPLATES } from '../types/schedule';
import { DEFAULT_FONT_ID, type FontId } from '../types/font';
import { useScheduleBuilder } from '../hooks/useScheduleBuilder';
import HospitalHeader from './HospitalHeader';
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
import styles from './ScheduleBuilderPage.module.css';
import OutputFormatSelector from './OutputFormatSelector';
import type { OutputFormat } from '../types/outputFormat';
import ClinicHoursEditor from './ClinicHoursEditor';

export default function ScheduleBuilderPage() {
  // Always begin with the intake screen. Browser storage survives a dev-server
  // restart, so restoring the previous hospital here skips the first screen.
  const [hospital, setHospital] = useState<HospitalInfo | null>(null);

  const handleHospitalSubmit = (nextHospital: HospitalInfo) => {
    setHospital(nextHospital);
  };

  if (!hospital) {
    return <HospitalIntakeForm onSubmit={handleHospitalSubmit} />;
  }

  return <ScheduleBuilderContent hospital={hospital} onHospitalChange={setHospital} onHospitalReset={() => setHospital(null)} />;
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
  const [previewMode, setPreviewMode] = useState<'sample' | 'schedule'>('schedule');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('square');
  const exportNodeRef = useRef<HTMLDivElement>(null);

  const handleReset = () => {
    actions.reset();
  };

  const selectedResolvedSchedule = selectedDateKey ? resolvedByDate.get(selectedDateKey) : undefined;
  const selectedHasOverride = selectedDateKey
    ? formData.dateSchedules.some((s) => s.date === selectedDateKey)
    : false;

  const selectedTemplate = formData.templateId ? TEMPLATES.find((t) => t.id === formData.templateId) : undefined;

  return (
    <div className={styles.page}>
      <header className={styles.hero} style={{ '--hero-accent': hospital.primaryColor } as CSSProperties}>
        <div className={styles.heroInner}>
          <span className={styles.heroBadge}>진료일정 이미지 자동 생성</span>
          <h1 className={styles.heroTitle}>진료일정 만들기</h1>
          <p className={styles.heroSubtitle}>
            휴진일과 진료 일정을 선택하면 안내 이미지가 실시간으로 완성돼요.
          </p>
        </div>
      </header>

      <div className={styles.container}>
        <HospitalHeader hospital={hospital} onChangeHospital={onHospitalReset} />
        <div className={styles.grid}>
          <div className={styles.leftCol}>
            <section className={`${styles.card} ${styles.templatePickerCard}`}>
              <h2 className={styles.cardTitle}>디자인 선택</h2>
              <p className={styles.cardHint}>먼저 마음에 드는 시안을 골라주세요. 아래에서 일정을 입력하면 바로 반영돼요.</p>
              <TemplateSelector selectedId={formData.templateId} onSelect={actions.setTemplateId} />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>제목 글씨 스타일</h2>
              <p className={styles.cardHint}>D형 제목을 테두리 표현 또는 진한 단색 채움으로 바꿀 수 있어요.</p>
              <TitleTextStyleSelector
                value={formData.titleTextStyle ?? 'outline'}
                onChange={actions.setTitleTextStyle}
              />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>폰트 선택</h2>
              <p className={styles.cardHint}>무료 상업 이용이 가능한 한글 폰트로 진료일정 이미지의 글꼴을 바꿀 수 있어요.</p>
              <FontSelector
                selectedId={(formData.fontId as FontId) ?? DEFAULT_FONT_ID}
                onSelect={actions.setFontId}
              />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>병원 로고</h2>
              <p className={styles.cardHint}>로고를 추가하면 진료일정표에 표시됩니다</p>
              <LogoUploadField
                logoUrl={hospital.logoUrl}
                onChange={(logoUrl) => onHospitalChange({ ...hospital, logoUrl })}
              />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>기본 설정</h2>
              <MonthSelector
                year={formData.year}
                month={formData.month}
                onChange={(year, month) => actions.setYearMonth(year, month)}
              />
              <CalendarLabelSelector
                value={formData.calendarLabelStyle ?? 'korean'}
                onChange={actions.setCalendarLabelStyle}
              />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>진료시간</h2>
              <p className={styles.cardHint}>
                A4와 DID 이미지의 제목 아래에 표시됩니다. 1080 × 1080 이미지에는 표시되지 않습니다.
              </p>
              <ClinicHoursEditor
                value={formData.clinicHours ?? { rows: [], lunchStart: '', lunchEnd: '', note: '' }}
                onChange={actions.setClinicHours}
              />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>정기 휴진 설정</h2>
              <p className={styles.cardHint}>매주 반복해서 쉬는 요일을 선택하세요.</p>
              <RecurringDaySelector selectedDays={formData.recurringClosedDays} onToggle={actions.toggleRecurringDay} />
              <p className={styles.cardHint}></p>
              <p className={styles.cardHint}>
              </p>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>휴가 설정</h2>
              <VacationRangeField
                start={formData.vacationStart}
                end={formData.vacationEnd}
                onChange={(start, end) => actions.setVacationRange(start, end)}
              />
            </section>

            <div className={styles.utilityRow}>
              <button type="button" className={styles.secondaryButton} disabled title="준비 중인 기능입니다.">
                이전 달 반복 설정 불러오기
              </button>
              <button type="button" className={styles.secondaryButton} onClick={handleReset}>
                전체 설정 초기화
              </button>
            </div>
            <p className={styles.utilityHint}>이전 달 반복 설정 불러오기는 준비 중인 기능입니다.</p>
          </div>

          <div className={styles.rightCol}>
            <div className={styles.previewTools}>
              <p className={styles.previewLabel}>실시간 미리보기</p>
              {selectedTemplate && (
                <div className={styles.previewActions}>
                  <p className={styles.previewEditHint}>
                    <span aria-hidden="true">☝</span>
                    날짜를 눌러 개별 일정 설정
                  </p>
                  <button type="button" className={styles.previewDesignButton} onClick={() => setTemplateModalOpen(true)}>
                    디자인 변경
                  </button>
                </div>
              )}
            </div>

            {selectedTemplate && (
              <OutputFormatSelector value={outputFormat} onChange={setOutputFormat} />
            )}

            {false && (
              <div className={styles.previewMode} aria-label="미리보기 종류">
                <button
                  type="button"
                  className={previewMode === 'sample' ? styles.previewModeActive : undefined}
                  aria-pressed={previewMode === 'sample'}
                  onClick={() => setPreviewMode('sample')}
                >
                  예시 시안
                </button>
                <button
                  type="button"
                  className={previewMode === 'schedule' ? styles.previewModeActive : undefined}
                  aria-pressed={previewMode === 'schedule'}
                  onClick={() => setPreviewMode('schedule')}
                >
                  내 일정
                </button>
              </div>
            )}

            {!selectedTemplate ? (
              <div className={styles.previewDisabled}>
                <p>왼쪽에서 디자인 시안을 먼저 선택해 주세요.</p>
              </div>
            ) : selectedTemplate && Boolean(false) ? (
              <div className={styles.previewStatic}>
                <img src={selectedTemplate.previewImageUrl} alt={`${selectedTemplate.name} 시안 예시`} />
              </div>
            ) : (
              <SchedulePreview
                ref={exportNodeRef}
                hospital={hospital}
                formData={formData}
                calendarMatrix={calendarMatrix}
                resolvedByDate={resolvedByDate}
                onDateClick={setSelectedDateKey}
                outputFormat={outputFormat}
              />
            )}

            {false && (
              <p className={styles.previewHint}>입력한 일정은 그대로 저장돼요. <strong>내 일정</strong>을 누르면 반영된 결과를 볼 수 있어요.</p>
            )}

            {selectedTemplate && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

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
          onClose={() => setCustomModalOpen(false)}
        />
      )}
    </div>
  );
}
