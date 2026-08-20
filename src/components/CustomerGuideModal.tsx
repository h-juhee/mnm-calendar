import { useState } from 'react';
import Modal from './Modal';
import styles from './CustomerGuideModal.module.css';

interface CustomerGuideModalProps {
  onClose: () => void;
}

const STEPS = [
  {
    title: '정기 일정을 먼저 설정해 주세요',
    description: '매주 반복되는 휴진일과 야간 진료 요일을 선택하고, 뱃지 표시 방식을 정해 주세요.',
    visual: (
      <div className={styles.settingsMock}>
        <strong>정기 설정</strong>
        <span>일</span><span className={styles.selected}>월</span><span>화</span><span>수</span><span>목</span><span className={styles.selected}>금</span><span>토</span>
      </div>
    ),
  },
  {
    title: '날짜를 눌러 개별 일정을 추가해 주세요',
    description: '달력의 날짜를 누르면 휴진·단축 진료·야간 진료 등 날짜별 일정을 최대 3개까지 설정할 수 있어요.',
    visual: (
      <div className={styles.calendarMock}>
        <span>14</span><span>15</span><span className={styles.calendarSelected}>16<small>날짜 선택</small></span><span>17</span><span>18</span>
      </div>
    ),
  },
  {
    title: '규격을 선택하고 제출해 주세요',
    description: '필요한 이미지 규격을 모두 선택한 뒤 미리보기를 확인하고 진료 일정을 제출해 주세요.',
    visual: (
      <div className={styles.submitMock}>
        <span className={styles.selectedFormat}>인스타 팝업</span>
        <span>A4 세로</span>
        <strong>진료일정 제출하기</strong>
      </div>
    ),
  },
] as const;

export default function CustomerGuideModal({ onClose }: CustomerGuideModalProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <Modal title="진료일정 만들기 사용 방법" onClose={onClose} panelClassName={styles.panel}>
      <div className={styles.progress} aria-label={`${STEPS.length}단계 중 ${step + 1}단계`}>
        {STEPS.map((item, index) => (
          <span key={item.title} className={index <= step ? styles.progressActive : undefined} />
        ))}
      </div>
      <div className={styles.content}>
        <span className={styles.stepLabel}>STEP {step + 1}</span>
        <h3>{current.title}</h3>
        <p>{current.description}</p>
        <div className={styles.visual}>{current.visual}</div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.skipButton} onClick={onClose}>건너뛰기</button>
        <div>
          {step > 0 && <button type="button" className={styles.previousButton} onClick={() => setStep((value) => value - 1)}>이전</button>}
          <button
            type="button"
            className={styles.nextButton}
            onClick={() => step === STEPS.length - 1 ? onClose() : setStep((value) => value + 1)}
          >
            {step === STEPS.length - 1 ? '일정 만들기 시작' : '다음'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
