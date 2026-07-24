import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import type { CalendarCell } from '../utils/scheduleUtils';
import { getCalendarSubtitle, getCalendarTitle } from '../utils/scheduleUtils';
import type {
  DateSchedule,
  DesignEdits,
  EditableLayerId,
  HospitalInfo,
  ScheduleFormData,
  TemplateId,
} from '../types/schedule';
import { getFontOption } from '../types/font';
import { ensureFontLoaded } from '../utils/fontLoader';
import ScheduleATemplate from './templates/ScheduleATemplate';
import ScheduleBTemplate from './templates/ScheduleBTemplate';
import ScheduleCTemplate from './templates/ScheduleCTemplate';
import ScheduleDTemplate from './templates/ScheduleDTemplate';
import Modal from './Modal';
import styles from './SchedulePreview.module.css';
import { getOutputFormatMeta, type OutputFormat } from '../types/outputFormat';
import { hasRenderableClinicHours } from '../utils/clinicHoursUtils';

interface SchedulePreviewProps {
  hospital: HospitalInfo;
  formData: ScheduleFormData;
  calendarMatrix: CalendarCell[][];
  resolvedByDate: Map<string, DateSchedule>;
  onDateClick?: (dateKey: string) => void;
  outputFormat: OutputFormat;
  onDesignEditsChange: (edits: DesignEdits) => void;
  customBackgroundUrl?: string;
  customBackgroundFileName?: string;
  onCustomBackgroundSelect: (file: File) => Promise<void>;
  onCustomBackgroundRemove: () => Promise<void>;
  onResetAllDesign: () => Promise<void>;
  activeEditor: 'background' | 'elements' | null;
  settingsContent: ReactNode;
  standardPanelContent: ReactNode;
  previewHeader: ReactNode;
  previewFooter: ReactNode;
  onOpenClinicHours: () => void;
}

type VisibleLayerId = EditableLayerId;

const LAYER_LABELS: Record<VisibleLayerId, string> = {
  title: '제목',
  subtitle: '부제목',
  hospital: '병원명·로고',
  clinicHours: '진료시간',
  calendar: '달력',
};

const TEMPLATE_COMPONENTS: Record<TemplateId, typeof ScheduleATemplate> = {
  scheduleA: ScheduleATemplate,
  scheduleB: ScheduleBTemplate,
  scheduleC: ScheduleCTemplate,
  scheduleD: ScheduleDTemplate,
};

const DEFAULT_FONT_SIZES: Record<OutputFormat, Record<VisibleLayerId, number>> = {
  square: { title: 96, subtitle: 26, hospital: 30, clinicHours: 32, calendar: 0 },
  a4: { title: 100, subtitle: 36, hospital: 65, clinicHours: 36, calendar: 0 },
  didHorizontal: { title: 190, subtitle: 64, hospital: 70, clinicHours: 54, calendar: 0 },
  didVertical: { title: 175, subtitle: 56, hospital: 75, clinicHours: 54, calendar: 0 },
};

const MAX_BACKGROUND_SIZE = 10 * 1024 * 1024;
const ACCEPTED_BACKGROUND_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const SchedulePreview = forwardRef<HTMLDivElement, SchedulePreviewProps>(function SchedulePreview(
  {
    hospital,
    formData,
    calendarMatrix,
    resolvedByDate,
    onDateClick,
    outputFormat,
    onDesignEditsChange,
    customBackgroundUrl,
    customBackgroundFileName,
    onCustomBackgroundSelect,
    onCustomBackgroundRemove,
    onResetAllDesign,
    activeEditor,
    settingsContent,
    standardPanelContent,
    previewHeader,
    previewFooter,
    onOpenClinicHours,
  },
  ref,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const inlineEditOriginalRef = useRef('');
  const [scale, setScale] = useState(1);
  const [selectedLayer, setSelectedLayer] = useState<VisibleLayerId>('title');
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const format = getOutputFormatMeta(outputFormat);
  const visibleLayerIds = (Object.keys(LAYER_LABELS) as VisibleLayerId[])
    .filter((id) => outputFormat !== 'square' || id !== 'clinicHours');
  const showClinicHoursGuide = outputFormat !== 'square'
    && !formData.clinicHours?.hidden
    && !hasRenderableClinicHours(formData.clinicHours);
  const hasIncompleteClinicHours = Boolean(formData.clinicHours?.rows.length);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const update = () => setScale(element.clientWidth / format.width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [format.width]);

  const Template = TEMPLATE_COMPONENTS[formData.templateId as TemplateId] ?? ScheduleATemplate;
  const fontOption = getFontOption(formData.fontId);

  useEffect(() => {
    void ensureFontLoaded(formData.fontId);
  }, [formData.fontId]);

  useEffect(() => {
    if (outputFormat === 'square' && selectedLayer === 'clinicHours') {
      setSelectedLayer('title');
    }
  }, [outputFormat, selectedLayer]);

  const selectedEdit = formData.designEdits?.[selectedLayer] ?? {};
  const selectedLabel = LAYER_LABELS[selectedLayer];
  const defaultFontSize = DEFAULT_FONT_SIZES[outputFormat][selectedLayer];
  const selectedText = selectedLayer === 'title'
    ? selectedEdit.text ?? getCalendarTitle(formData.month, formData.calendarLabelStyle)
    : selectedLayer === 'subtitle'
      ? selectedEdit.text ?? getCalendarSubtitle(formData.calendarLabelStyle)
      : selectedLayer === 'hospital'
        ? selectedEdit.text ?? hospital.name
        : '';

  const updateSelected = (patch: DesignEdits[EditableLayerId]) => {
    onDesignEditsChange({
      ...(formData.designEdits ?? {}),
      [selectedLayer]: { ...selectedEdit, ...patch },
    });
  };

  const resetSelected = () => {
    const next = { ...(formData.designEdits ?? {}) };
    delete next[selectedLayer];
    onDesignEditsChange(next);
  };

  const handleBackgroundFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_BACKGROUND_TYPES.includes(file.type)) {
      setBackgroundError('PNG, JPG, WEBP 이미지 파일만 사용할 수 있어요.');
      return;
    }
    if (file.size > MAX_BACKGROUND_SIZE) {
      setBackgroundError('배경 이미지는 10MB 이하로 올려주세요.');
      return;
    }
    try {
      await onCustomBackgroundSelect(file);
      setBackgroundError(null);
    } catch {
      setBackgroundError('배경 이미지를 저장하지 못했어요. 다시 시도해주세요.');
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    let target = (event.target as HTMLElement).closest<HTMLElement>('[data-edit-layer]');
    if (!target) return;
    if (target.isContentEditable) return;
    const id = target.dataset.editLayer as EditableLayerId;
    if (id === 'calendar' && (event.target as HTMLElement).closest('button')) return;

    // pointerdown의 preventDefault 때문에 브라우저가 현재 contentEditable의
    // 포커스를 자동으로 해제하지 못합니다. 편집 DOM을 남긴 채 React가 다른
    // 레이어 선택을 렌더링하면 텍스트가 비거나 사라질 수 있으므로 먼저 저장합니다.
    const activeInlineEditor = wrapperRef.current?.querySelector<HTMLElement>(
      '[data-edit-layer][contenteditable="true"]',
    );
    if (activeInlineEditor && activeInlineEditor !== target) {
      // React 19는 같은 pointer 이벤트 안의 blur/setState와 아래의 레이어
      // 선택을 한 번에 배치할 수 있습니다. contentEditable로 직접 바뀐 DOM을
      // 먼저 상태에 반영한 뒤 다음 선택 렌더링을 시작해야 내용이 보존됩니다.
      flushSync(() => activeInlineEditor.blur());
      target = wrapperRef.current?.querySelector<HTMLElement>(`[data-edit-layer="${id}"]`) ?? target;
    }

    setSelectedLayer(id);
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = formData.designEdits?.[id] ?? {};
    const rect = target.getBoundingClientRect();
    const handleSize = Math.max(14, 24 * scale);
    const isResize = event.clientX >= rect.right - handleSize
      && event.clientY >= rect.bottom - handleSize;
    const initialScale = initial.scale ?? 1;
    const logicalWidth = rect.width / scale / initialScale;
    const logicalHeight = rect.height / scale / initialScale;
    const onMove = (moveEvent: PointerEvent) => {
      if (isResize) {
        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;
        const widthRatio = (logicalWidth + dx) / logicalWidth;
        const heightRatio = (logicalHeight + dy) / logicalHeight;
        const nextScale = Math.min(3.5, Math.max(0.2, initialScale * Math.max(widthRatio, heightRatio)));
        onDesignEditsChange({
          ...(formData.designEdits ?? {}),
          [id]: { ...initial, scale: Math.round(nextScale * 100) / 100 },
        });
        return;
      }
      onDesignEditsChange({
        ...(formData.designEdits ?? {}),
        [id]: {
          ...initial,
          x: Math.round((initial.x ?? 0) + (moveEvent.clientX - startX) / scale),
          y: Math.round((initial.y ?? 0) + (moveEvent.clientY - startY) / scale),
        },
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-edit-layer]');
    if (!target || target.querySelector('img')) return;
    const id = target.dataset.editLayer as EditableLayerId;
    if (!['title', 'subtitle', 'hospital'].includes(id)) return;
    inlineEditOriginalRef.current = target.textContent ?? '';
    target.contentEditable = 'true';
    target.spellcheck = false;
    target.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    selection?.removeAllRanges();
    selection?.addRange(range);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleInlineBlur = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.matches('[data-edit-layer][contenteditable="true"]')) return;
    const id = target.dataset.editLayer as EditableLayerId;
    target.contentEditable = 'false';
    onDesignEditsChange({
      ...(formData.designEdits ?? {}),
      [id]: {
        ...(formData.designEdits?.[id] ?? {}),
        text: (target.textContent ?? '').trim(),
      },
    });
  };

  const handleInlineKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.isContentEditable) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      target.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      target.textContent = inlineEditOriginalRef.current;
      target.blur();
    }
  };

  const isLogoLayer = selectedLayer === 'hospital' && Boolean(hospital.logoUrl);

  return (
    <div className={styles.wrapper}>
      <aside className={styles.settingsColumn}>
        <div className={styles.settingsShell}>
        {settingsContent}
        <div className={styles.settingsContent}>
        {activeEditor && (
        <div className={styles.editorPanel}>
        <section className={styles.editorSection} hidden={activeEditor !== 'background'}>
          <div className={styles.sectionHeading}>
            <h3>배경 이미지</h3>
            <p>업로드한 이미지는 비율을 유지하며 영역 중앙에 자동으로 맞춰져요.</p>
          </div>
          <input
            ref={backgroundInputRef}
            className={styles.fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleBackgroundFile}
          />
          {customBackgroundUrl ? (
            <div className={styles.backgroundSummary}>
              <img src={customBackgroundUrl} alt="업로드한 배경 미리보기" />
              <div className={styles.backgroundInfo}>
                <strong title={customBackgroundFileName}>{customBackgroundFileName ?? '업로드한 배경 이미지'}</strong>
                <span>PNG, JPG, WEBP · 최대 10MB</span>
                <div className={styles.backgroundActions}>
                  <button type="button" onClick={() => backgroundInputRef.current?.click()}>이미지 변경</button>
                  <button type="button" className={styles.dangerButton} onClick={() => void onCustomBackgroundRemove()}>삭제</button>
                </div>
              </div>
              <button type="button" className={styles.defaultBackgroundButton} onClick={() => void onCustomBackgroundRemove()}>
                기본 배경으로 되돌리기
              </button>
            </div>
          ) : (
            <button type="button" className={styles.addBackgroundButton} onClick={() => backgroundInputRef.current?.click()}>
              <strong>＋ 배경 이미지 추가</strong>
              <span>PNG, JPG, WEBP · 최대 10MB</span>
            </button>
          )}
          {backgroundError && <p className={styles.errorMessage}>{backgroundError}</p>}
        </section>

        <section className={styles.editorSection} hidden={activeEditor !== 'elements'}>
          <div className={styles.sectionHeading}>
            <h3>요소 편집</h3>
            <p>미리보기에서 요소를 직접 드래그해도 위치가 변경돼요.</p>
          </div>
          <div className={styles.layerTabs} role="tablist" aria-label="편집할 요소">
            {visibleLayerIds.map((id) => (
              <button
                type="button"
                role="tab"
                aria-selected={selectedLayer === id}
                key={id}
                className={selectedLayer === id ? styles.activeLayer : undefined}
                onClick={() => setSelectedLayer(id)}
              >
                {LAYER_LABELS[id]}
              </button>
            ))}
          </div>

          <div className={styles.elementControls}>
            <h4>{isLogoLayer ? '로고 설정' : `${selectedLabel} 설정`}</h4>
            {selectedLayer !== 'clinicHours' && selectedLayer !== 'calendar' && !isLogoLayer && (
              <label className={styles.field}>
                <span>문구</span>
                <input
                  type="text"
                  value={selectedText}
                  onChange={(event) => updateSelected({ text: event.target.value })}
                />
              </label>
            )}

            {selectedLayer === 'calendar' ? (
              <p className={styles.calendarDragHint}>미리보기의 요일 영역이나 달력 테두리를 드래그해 위치를 옮길 수 있어요.</p>
            ) : isLogoLayer ? (
              <label className={styles.sliderField}>
                <span>로고 크기 <output>{Math.round((selectedEdit.scale ?? 1) * 100)}%</output></span>
                <input
                  type="range"
                  min="0.3"
                  max="2.5"
                  step="0.05"
                  value={selectedEdit.scale ?? 1}
                  onChange={(event) => updateSelected({ scale: Number(event.target.value) })}
                />
              </label>
            ) : (
              <>
                <label className={styles.sliderField}>
                  <span>글자 크기 <output>{Math.round(selectedEdit.fontSize ?? defaultFontSize)}px</output></span>
                  <input
                    type="range"
                    min={Math.max(10, Math.round(defaultFontSize * 0.35))}
                    max={Math.round(defaultFontSize * 2.2)}
                    value={selectedEdit.fontSize ?? defaultFontSize}
                    onChange={(event) => updateSelected({ fontSize: Number(event.target.value), scale: 1 })}
                  />
                </label>
                <label className={styles.colorField}>
                  <span>글자 색상</span>
                  <input
                    type="color"
                    value={selectedEdit.color ?? '#111827'}
                    onChange={(event) => updateSelected({ color: event.target.value })}
                  />
                  <output>{selectedEdit.color ?? '#111827'}</output>
                </label>
              </>
            )}

            <button type="button" className={styles.resetElementButton} onClick={resetSelected}>
              {selectedLabel} 설정 초기화
            </button>
          </div>
        </section>

        </div>
        )}
        {!activeEditor && standardPanelContent}
        <div className={styles.allResetRow}>
          <button type="button" onClick={() => setShowResetConfirm(true)}>전체 설정 초기화</button>
        </div>
        </div>
        </div>
      </aside>

      <div className={styles.previewColumn}>
        {previewHeader}
        <div className={styles.canvasWrapper} ref={wrapperRef}>
        <div className={styles.scaledBox} style={{ height: format.height * scale }}>
          <div
            ref={ref}
            className={styles.exportNode}
            data-output-format={outputFormat}
            style={{ width: format.width, height: format.height, transform: `scale(${scale})` }}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            onBlurCapture={handleInlineBlur}
            onKeyDownCapture={handleInlineKeyDown}
          >
            <Template
              hospital={hospital}
              year={formData.year}
              month={formData.month}
              calendarMatrix={calendarMatrix}
              resolvedByDate={resolvedByDate}
              onDateClick={onDateClick}
              fontFamily={fontOption.family}
              calendarLabelStyle={formData.calendarLabelStyle}
              titleTextStyle={formData.titleTextStyle}
              outputFormat={outputFormat}
              clinicHours={formData.clinicHours}
              reserveClinicHoursSpace={showClinicHoursGuide}
              designEdits={formData.designEdits}
              selectedLayer={selectedLayer}
              customBackgroundUrl={customBackgroundUrl}
            />
          </div>
          {showClinicHoursGuide && (
            <div
              className={`${styles.clinicHoursGuideLayer} ${styles[outputFormat]}`}
              style={{ width: format.width, height: format.height, transform: `scale(${scale})` }}
              data-editor-only
            >
              <div className={styles.clinicHoursGuide}>
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <strong>{hasIncompleteClinicHours ? '진료시간 설정을 완료해 주세요.' : '진료시간이 아직 설정되지 않았어요.'}</strong>
                <span>
                  {hasIncompleteClinicHours
                    ? '요일과 시작·종료 시간을 입력하면 이미지에 표시됩니다.'
                    : '진료시간을 입력하면 이 위치에 표시됩니다.'}
                </span>
                <button type="button" onClick={onOpenClinicHours}>
                  {hasIncompleteClinicHours ? '진료시간 설정 계속하기' : '진료시간 설정하기'}
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
        {previewFooter}
      </div>

      {showResetConfirm && (
        <Modal title="전체 설정 초기화" onClose={() => setShowResetConfirm(false)}>
          <div className={styles.confirmContent}>
            <p><strong>모든 설정을 초기 상태로 되돌릴까요?</strong></p>
            <p>일정, 배경 이미지, 글자 위치와 스타일 설정이 모두 초기화됩니다.</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setShowResetConfirm(false)}>취소</button>
              <button
                type="button"
                className={styles.confirmResetButton}
                onClick={() => {
                  void onResetAllDesign().then(() => setShowResetConfirm(false));
                }}
              >
                전체 초기화
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
});

export default SchedulePreview;
