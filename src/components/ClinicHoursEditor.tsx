import type { ClinicHours, ClinicHoursRow } from '../types/schedule';
import styles from './ClinicHoursEditor.module.css';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface ClinicHoursEditorProps {
  value: ClinicHours;
  onChange: (value: ClinicHours) => void;
}

function createRow(): ClinicHoursRow {
  return {
    id: `hours-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    days: [],
    startTime: '09:30',
    endTime: '18:30',
    badgeLabel: '',
  };
}

export default function ClinicHoursEditor({ value, onChange }: ClinicHoursEditorProps) {
  const updateRow = (id: string, patch: Partial<ClinicHoursRow>) => {
    onChange({
      ...value,
      rows: value.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  };

  return (
    <div className={styles.wrap}>
      {value.rows.map((row, index) => (
        <div className={styles.rowCard} key={row.id}>
          <div className={styles.rowHeader}>
            <strong>진료시간 {index + 1}</strong>
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => onChange({ ...value, rows: value.rows.filter((item) => item.id !== row.id) })}
            >
              삭제
            </button>
          </div>
          <div className={styles.days} aria-label={`진료시간 ${index + 1} 요일`}>
            {DAY_LABELS.map((label, day) => {
              const selected = row.days.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selected}
                  className={selected ? `${styles.day} ${styles.dayActive}` : styles.day}
                  onClick={() => updateRow(row.id, {
                    days: selected ? row.days.filter((item) => item !== day) : [...row.days, day].sort(),
                  })}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className={styles.timeFields}>
            <label>
              시작
              <input type="time" value={row.startTime} onChange={(event) => updateRow(row.id, { startTime: event.target.value })} />
            </label>
            <label>
              종료
              <input type="time" value={row.endTime} onChange={(event) => updateRow(row.id, { endTime: event.target.value })} />
            </label>
            <label className={styles.badgeField}>
              배지 문구
              <input
                type="text"
                maxLength={10}
                value={row.badgeLabel ?? ''}
                placeholder="예: 야간진료"
                onChange={(event) => updateRow(row.id, { badgeLabel: event.target.value })}
              />
            </label>
          </div>
        </div>
      ))}

      <button type="button" className={styles.addButton} onClick={() => onChange({ ...value, rows: [...value.rows, createRow()] })}>
        + 진료시간 추가
      </button>

      <div className={styles.secondaryFields}>
        <div className={styles.lunchFields}>
          <span>점심시간</span>
          <input type="time" value={value.lunchStart} onChange={(event) => onChange({ ...value, lunchStart: event.target.value })} />
          <span>~</span>
          <input type="time" value={value.lunchEnd} onChange={(event) => onChange({ ...value, lunchEnd: event.target.value })} />
        </div>
        <label className={styles.noteField}>
          추가 안내
          <input
            type="text"
            maxLength={50}
            value={value.note}
            placeholder="예: 토요일 점심시간 없이 진료"
            onChange={(event) => onChange({ ...value, note: event.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
