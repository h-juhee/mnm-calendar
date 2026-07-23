import { useRef, useState, type CSSProperties } from 'react';
import type { TemplateId } from '../types/schedule';
import { SAMPLE_HOSPITAL } from '../data/sampleHospital';
import { useScheduleBuilder } from '../hooks/useScheduleBuilder';
import HospitalHeader from './HospitalHeader';
import ProgressSteps from './ProgressSteps';
import MonthSelector from './MonthSelector';
import RecurringDaySelector from './RecurringDaySelector';
import ScheduleCalendar from './ScheduleCalendar';
import DateScheduleModal from './DateScheduleModal';
import VacationRangeField from './VacationRangeField';
import NoticeField from './NoticeField';
import TemplateSelector from './TemplateSelector';
import SchedulePreview from './SchedulePreview';
import ExportImageButton from './ExportImageButton';
import CustomDesignRequestModal from './CustomDesignRequestModal';
import styles from './ScheduleBuilderPage.module.css';

export default function ScheduleBuilderPage() {
  const hospital = SAMPLE_HOSPITAL;
  const { formData, resolvedSchedule, resolvedByDate, calendarMatrix, actions } = useScheduleBuilder(hospital.id);

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [previousMonthMessage, setPreviousMonthMessage] = useState<string | null>(null);
  const [isCustomModalOpen, setCustomModalOpen] = useState(false);
  const exportNodeRef = useRef<HTMLDivElement>(null);

  const handleLoadPrevious = () => {
    const loaded = actions.loadPreviousMonth();
    setPreviousMonthMessage(loaded ? '이전 달 일정을 불러왔습니다.' : '저장된 이전 일정이 없습니다.');
  };

  const handleReset = () => {
    actions.reset();
    setPreviousMonthMessage(null);
  };

  const selectedResolvedSchedule = selectedDateKey ? resolvedByDate.get(selectedDateKey) : undefined;
  const selectedHasOverride = selectedDateKey
    ? formData.dateSchedules.some((s) => s.date === selectedDateKey)
    : false;

  const progressSteps = [
    { label: '기본 설정', done: true },
    { label: '휴진 설정', done: formData.recurringClosedDays.length > 0 || formData.dateSchedules.length > 0 },
    { label: '휴가 설정', done: Boolean(formData.vacationStart && formData.vacationEnd) },
    { label: '안내 문구', done: formData.notice.trim().length > 0 },
    { label: '디자인 선택', done: true },
  ];

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
        <ProgressSteps steps={progressSteps} />

        <div className={styles.grid}>
          <div className={styles.leftCol}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>기본 설정</h2>
              <MonthSelector
                year={formData.year}
                month={formData.month}
                onChange={(year, month) => actions.setYearMonth(year, month)}
              />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>휴진 설정</h2>
              <p className={styles.cardHint}>매주 반복해서 쉬는 요일을 선택하세요.</p>
              <RecurringDaySelector selectedDays={formData.recurringClosedDays} onToggle={actions.toggleRecurringDay} />

              <div className={styles.calendarDivider} />

              <p className={styles.cardHint}>
                날짜를 눌러 휴진, 단축 진료 등을 설정하세요. 다시 누르면 수정할 수 있어요.
              </p>
              <ScheduleCalendar
                calendarMatrix={calendarMatrix}
                resolvedByDate={resolvedByDate}
                onDateClick={setSelectedDateKey}
              />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>휴가 설정</h2>
              <VacationRangeField
                start={formData.vacationStart}
                end={formData.vacationEnd}
                onChange={(start, end) => actions.setVacationRange(start, end)}
              />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>안내 문구</h2>
              <NoticeField value={formData.notice} onChange={actions.setNotice} />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>디자인 선택</h2>
              <TemplateSelector selectedId={formData.templateId as TemplateId} onSelect={actions.setTemplateId} />
            </section>

            {previousMonthMessage && <p className={styles.noticeMessage}>{previousMonthMessage}</p>}

            <div className={styles.utilityRow}>
              <button type="button" className={styles.secondaryButton} onClick={handleLoadPrevious}>
                이전 달 일정 불러오기
              </button>
              <button type="button" className={styles.secondaryButton} onClick={handleReset}>
                초기화
              </button>
            </div>
          </div>

          <div className={styles.rightCol}>
            <p className={styles.previewLabel}>실시간 미리보기</p>
            <SchedulePreview
              ref={exportNodeRef}
              hospital={hospital}
              formData={formData}
              calendarMatrix={calendarMatrix}
              resolvedByDate={resolvedByDate}
            />
            <ExportImageButton nodeRef={exportNodeRef} hospitalName={hospital.name} year={formData.year} month={formData.month} />
            <button type="button" className={styles.secondaryButton} onClick={() => setCustomModalOpen(true)}>
              맞춤 디자인 요청 (10,000원)
            </button>
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

      {isCustomModalOpen && (
        <CustomDesignRequestModal
          hospital={hospital}
          formData={formData}
          resolvedSchedule={resolvedSchedule}
          onClose={() => setCustomModalOpen(false)}
        />
      )}
    </div>
  );
}
