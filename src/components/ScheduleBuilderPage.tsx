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
import SchedulePreview from './SchedulePreview';
import ExportImageButton from './ExportImageButton';
import CustomDesignRequestModal from './CustomDesignRequestModal';
import Modal from './Modal';
import styles from './ScheduleBuilderPage.module.css';

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

  return <ScheduleBuilderContent hospital={hospital} onHospitalChange={setHospital} />;
}

function ScheduleBuilderContent({
  hospital,
  onHospitalChange,
}: {
  hospital: HospitalInfo;
  onHospitalChange: (hospital: HospitalInfo) => void;
}) {
  const { formData, resolvedSchedule, resolvedByDate, calendarMatrix, actions } = useScheduleBuilder(hospital.id);

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [previousMonthMessage, setPreviousMonthMessage] = useState<string | null>(null);
  const [isCustomModalOpen, setCustomModalOpen] = useState(false);
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(() => formData.templateId === null);
  const [previewMode, setPreviewMode] = useState<'sample' | 'schedule'>('schedule');
  const exportNodeRef = useRef<HTMLDivElement>(null);

  const handleLoadPrevious = () => {
    const loaded = actions.loadPreviousMonth();
    setPreviousMonthMessage(loaded ? '이전 달 반복 설정을 불러왔습니다.' : '저장된 이전 반복 설정이 없습니다.');
  };

  const handleReset = () => {
    actions.reset();
    setPreviousMonthMessage(null);
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
          <span className={styles.heroBadge}>치과 진료일정 자동 생성 서비스</span>
          <h1 className={styles.heroTitle}>진료일정 만들기</h1>
          <p className={styles.heroSubtitle}>
            휴진일과 진료 일정을 선택하면, 오른쪽에서 안내 이미지가 실시간으로 완성돼요.
          </p>
        </div>
      </header>

      <div className={styles.container}>
        <HospitalHeader hospital={hospital} />
        <div className={styles.templateChangeRow}>
          <button type="button" className={styles.templateChangeButton} onClick={() => setTemplateModalOpen(true)}>
            시안 변경
          </button>
        </div>

        <div className={styles.grid}>
          <div className={styles.leftCol}>
            <section className={`${styles.card} ${styles.templatePickerCard}`}>
              <h2 className={styles.cardTitle}>디자인 선택</h2>
              <p className={styles.cardHint}>먼저 마음에 드는 시안을 골라주세요. 아래에서 일정을 입력하면 바로 반영돼요.</p>
              <TemplateSelector selectedId={formData.templateId} onSelect={actions.setTemplateId} />
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
              <p className={styles.cardHint}>로고 파일이 있다면 추가해 주세요.</p>
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
              <h2 className={styles.cardTitle}>휴진 설정</h2>
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

            {previousMonthMessage && <p className={styles.noticeMessage}>{previousMonthMessage}</p>}

            <div className={styles.utilityRow}>
              <button type="button" className={styles.secondaryButton} onClick={handleLoadPrevious}>
                이전 달 반복 설정 불러오기
              </button>
              <button type="button" className={styles.secondaryButton} onClick={handleReset}>
                초기화
              </button>
            </div>
            <p className={styles.utilityHint}>날짜별 일정과 휴가 기간은 가져오지 않습니다.</p>
          </div>

          <div className={styles.rightCol}>
            <p className={styles.previewLabel}>실시간 미리보기</p>
            {selectedTemplate && (
              <p className={styles.previewEditHint}>
                <span aria-hidden="true">☝</span>
                날짜를 터치해 일정 수정
              </p>
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
