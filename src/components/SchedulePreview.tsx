import {
  forwardRef,
  useCallback,
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
import { DEFAULT_FONT_ID, getFontOption, type FontId } from '../types/font';
import { ensureFontLoaded } from '../utils/fontLoader';
import ScheduleATemplate from './templates/ScheduleATemplate';
import ScheduleBTemplate from './templates/ScheduleBTemplate';
import ScheduleCTemplate from './templates/ScheduleCTemplate';
import ScheduleDTemplate from './templates/ScheduleDTemplate';
import Modal from './Modal';
import FontSelector from './FontSelector';
import styles from './SchedulePreview.module.css';
import { getOutputFormatMeta, type OutputFormat } from '../types/outputFormat';
import { hasRenderableClinicHours } from '../utils/clinicHoursUtils';

interface SchedulePreviewProps {
  hospital: HospitalInfo;
  formData: ScheduleFormData;
  designEdits: DesignEdits;
  calendarMatrix: CalendarCell[][];
  resolvedByDate: Map<string, DateSchedule>;
  onDateClick?: (dateKey: string) => void;
  outputFormat: OutputFormat;
  onDesignEditsChange: (edits: DesignEdits) => void;
  customBackgroundUrl?: string;
  customBackgroundFileName?: string;
  onCustomBackgroundSelect: (file: File) => Promise<void>;
  onCustomBackgroundRemove: () => Promise<void>;
  onResetSchedule: () => void;
  onResetDesign: () => Promise<void>;
  onResetAll: () => Promise<void>;
  activeEditor: 'background' | 'elements' | null;
  settingsPanelVisible: boolean;
  settingsContent: ReactNode;
  standardPanelContent: ReactNode;
  hospitalLogoEditor: ReactNode;
  titleStyleEditor: ReactNode;
  previewHeader: ReactNode;
  previewFooter: ReactNode;
  onOpenElements: () => void;
  onOpenClinicHours: () => void;
}

type VisibleLayerId = EditableLayerId;

const LAYER_LABELS: Record<VisibleLayerId, string> = {
  title: '제목',
  subtitle: '부제목',
  hospital: '병원 표시',
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
const MAX_DESIGN_HISTORY = 50;
const DEFAULT_TITLE_OUTLINE_COLORS: Record<TemplateId, string> = {
  scheduleA: '#1e3a5f',
  scheduleB: '#ec4899',
  scheduleC: '#111827',
  scheduleD: '#073a8c',
};

function copyDesignEdits(edits: DesignEdits | undefined): DesignEdits {
  return Object.fromEntries(
    Object.entries(edits ?? {}).map(([id, edit]) => [id, { ...edit }]),
  ) as DesignEdits;
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable
    || Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

const SchedulePreview = forwardRef<HTMLDivElement, SchedulePreviewProps>(function SchedulePreview(
  {
    hospital,
    formData,
    designEdits,
    calendarMatrix,
    resolvedByDate,
    onDateClick,
    outputFormat,
    onDesignEditsChange,
    customBackgroundUrl,
    customBackgroundFileName,
    onCustomBackgroundSelect,
    onCustomBackgroundRemove,
    onResetSchedule,
    onResetDesign,
    onResetAll,
    activeEditor,
    settingsPanelVisible,
    settingsContent,
    standardPanelContent,
    hospitalLogoEditor,
    titleStyleEditor,
    previewHeader,
    previewFooter,
    onOpenElements,
    onOpenClinicHours,
  },
  ref,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const inlineEditOriginalRef = useRef('');
  const currentDesignEditsRef = useRef<DesignEdits>(copyDesignEdits(designEdits));
  const undoStackRef = useRef<DesignEdits[]>([]);
  const redoStackRef = useRef<DesignEdits[]>([]);
  const [fitScale, setFitScale] = useState(1);
  const [selectedLayer, setSelectedLayer] = useState<VisibleLayerId>('title');
  const [expandedLayer, setExpandedLayer] = useState<VisibleLayerId | null>('title');
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState<'schedule' | 'design' | 'all' | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const format = getOutputFormatMeta(outputFormat);
  const visibleLayerIds = (Object.keys(LAYER_LABELS) as VisibleLayerId[])
    .filter((id) => outputFormat !== 'square' || id !== 'clinicHours');
  const showClinicHoursGuide = outputFormat !== 'square'
    && !formData.clinicHours?.hidden
    && !hasRenderableClinicHours(formData.clinicHours);
  const hasIncompleteClinicHours = Boolean(formData.clinicHours?.rows.length);
  const scale = fitScale;

  useEffect(() => {
    currentDesignEditsRef.current = copyDesignEdits(designEdits);
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, [designEdits, outputFormat]);

  const applyDesignEdits = useCallback((edits: DesignEdits) => {
    const next = copyDesignEdits(edits);
    currentDesignEditsRef.current = next;
    onDesignEditsChange(next);
  }, [onDesignEditsChange]);

  const rememberDesignState = useCallback((edits: DesignEdits) => {
    undoStackRef.current = [
      ...undoStackRef.current.slice(-(MAX_DESIGN_HISTORY - 1)),
      copyDesignEdits(edits),
    ];
    redoStackRef.current = [];
  }, []);

  const changeDesignEdits = useCallback((edits: DesignEdits) => {
    rememberDesignState(currentDesignEditsRef.current);
    applyDesignEdits(edits);
  }, [applyDesignEdits, rememberDesignState]);

  useEffect(() => {
    const handleUndoRedo = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isTextEditingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey);
      if (!isUndo && !isRedo) return;

      const source = isUndo ? undoStackRef : redoStackRef;
      const destination = isUndo ? redoStackRef : undoStackRef;
      const previous = source.current.at(-1);
      if (!previous) return;

      event.preventDefault();
      source.current = source.current.slice(0, -1);
      destination.current = [
        ...destination.current.slice(-(MAX_DESIGN_HISTORY - 1)),
        copyDesignEdits(currentDesignEditsRef.current),
      ];
      applyDesignEdits(previous);
    };

    window.addEventListener('keydown', handleUndoRedo);
    return () => window.removeEventListener('keydown', handleUndoRedo);
  }, [applyDesignEdits]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const update = () => setFitScale(element.clientWidth / format.width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [format.width]);

  const Template = TEMPLATE_COMPONENTS[formData.templateId as TemplateId] ?? ScheduleATemplate;
  const fontOption = getFontOption(formData.fontId);

  useEffect(() => {
    void ensureFontLoaded(formData.fontId);
    Object.values(designEdits).forEach((edit) => {
      if (edit?.fontId) void ensureFontLoaded(edit.fontId);
    });
  }, [designEdits, formData.fontId]);

  useEffect(() => {
    if (outputFormat === 'square' && selectedLayer === 'clinicHours') {
      setSelectedLayer('title');
      setExpandedLayer('title');
    }
  }, [outputFormat, selectedLayer]);

  const selectedEdit = designEdits[selectedLayer] ?? {};
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
    changeDesignEdits({
      ...designEdits,
      [selectedLayer]: { ...selectedEdit, ...patch },
    });
  };

  const resetSelected = () => {
    const next = { ...designEdits };
    delete next[selectedLayer];
    changeDesignEdits(next);
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
    setExpandedLayer(id);
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = designEdits[id] ?? {};
    const designBeforeDrag = copyDesignEdits(designEdits);
    let didChange = false;
    const rect = target.getBoundingClientRect();
    const handleSize = Math.max(14, 24 * scale);
    const isResize = event.clientX >= rect.right - handleSize
      && event.clientY >= rect.bottom - handleSize;
    const initialScale = initial.scale ?? 1;
    const logicalWidth = rect.width / scale / initialScale;
    const logicalHeight = rect.height / scale / initialScale;
    const onMove = (moveEvent: PointerEvent) => {
      didChange = true;
      if (isResize) {
        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;
        const widthRatio = (logicalWidth + dx) / logicalWidth;
        const heightRatio = (logicalHeight + dy) / logicalHeight;
        const nextScale = Math.min(3.5, Math.max(0.2, initialScale * Math.max(widthRatio, heightRatio)));
        applyDesignEdits({
          ...designEdits,
          [id]: { ...initial, scale: Math.round(nextScale * 100) / 100 },
        });
        return;
      }
      applyDesignEdits({
        ...designEdits,
        [id]: {
          ...initial,
          x: Math.round((initial.x ?? 0) + (moveEvent.clientX - startX) / scale),
          y: Math.round((initial.y ?? 0) + (moveEvent.clientY - startY) / scale),
        },
      });
    };
    const onUp = () => {
      if (didChange) rememberDesignState(designBeforeDrag);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-edit-layer]');
    if (!target) return;
    const id = target.dataset.editLayer as EditableLayerId;
    setSelectedLayer(id);
    setExpandedLayer(id);
    onOpenElements();

    if (target.querySelector('img') || !['title', 'subtitle', 'hospital'].includes(id)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
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
    changeDesignEdits({
      ...designEdits,
      [id]: {
        ...(designEdits[id] ?? {}),
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
          <div className={styles.layerAccordion}>
            {visibleLayerIds.map((id) => (
              <div
                className={`${styles.accordionItem} ${expandedLayer === id ? styles.openAccordionItem : ''}`}
                key={id}
              >
                <button
                  type="button"
                  className={styles.accordionTrigger}
                  aria-expanded={expandedLayer === id}
                  aria-controls={`layer-controls-${id}`}
                  onClick={() => {
                    setSelectedLayer(id);
                    setExpandedLayer((current) => current === id ? null : id);
                  }}
                >
                  <span>{LAYER_LABELS[id]}</span>
                  <svg aria-hidden="true" viewBox="0 0 20 20">
                    <path d="m5 7.5 5 5 5-5" />
                  </svg>
                </button>
                {expandedLayer === id && (
                  <div id={`layer-controls-${id}`} className={styles.elementControls}>
                    <h4>
                      {selectedLayer === 'hospital'
                        ? isLogoLayer ? '로고 설정' : '병원명 설정'
                        : `${selectedLabel} 설정`}
                    </h4>
                    {selectedLayer === 'hospital' && (
                      <div className={styles.hospitalLogoEditor}>
                        <p className={styles.hospitalDisplayHint}>
                          {isLogoLayer
                            ? '현재 병원명 대신 로고가 표시됩니다. 로고를 삭제하면 병원명이 다시 표시돼요.'
                            : '현재 병원명이 표시됩니다. 로고를 추가하면 같은 자리에 병원명 대신 로고가 표시돼요.'}
                        </p>
                        {hospitalLogoEditor}
                      </div>
                    )}
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
                    {!isLogoLayer && (
                      <div className={styles.layerFontField}>
                        <span>폰트</span>
                        <FontSelector
                          selectedId={(selectedEdit.fontId as FontId | undefined) ?? formData.fontId ?? DEFAULT_FONT_ID}
                          onSelect={(fontId) => updateSelected({ fontId })}
                        />
                      </div>
                    )}
                    {selectedLayer === 'title' && (
                      <div className={styles.titleStyleEditor}>
                        <span>글자 스타일</span>
                        {titleStyleEditor}
                      </div>
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
                          <span>
                            글자 크기
                            <output>
                              {Math.round(selectedEdit.fontSize ?? defaultFontSize)}px
                            </output>
                          </span>
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
                        {selectedLayer === 'title' && formData.titleTextStyle !== 'filled' && (
                          <label className={styles.colorField}>
                            <span>테두리 색상</span>
                            <input
                              type="color"
                              value={selectedEdit.outlineColor ?? DEFAULT_TITLE_OUTLINE_COLORS[formData.templateId as TemplateId] ?? '#1e3a5f'}
                              onChange={(event) => updateSelected({ outlineColor: event.target.value })}
                            />
                            <output>
                              {selectedEdit.outlineColor ?? DEFAULT_TITLE_OUTLINE_COLORS[formData.templateId as TemplateId] ?? '#1e3a5f'}
                            </output>
                          </label>
                        )}
                      </>
                    )}

                    <button type="button" className={styles.resetElementButton} onClick={resetSelected}>
                      {selectedLabel} 설정 초기화
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        </div>
        )}
        {!activeEditor && standardPanelContent}
        {settingsPanelVisible && (
        <div className={styles.allResetRow}>
          <button type="button" onClick={() => setResetConfirm(activeEditor ? 'design' : 'schedule')}>
            {activeEditor ? '디자인 설정 초기화' : '일정 설정 초기화'}
          </button>
          <details className={styles.dangerZone}>
            <summary>위험 작업</summary>
            <button type="button" onClick={() => setResetConfirm('all')}>현재 월 전체 작업 초기화</button>
          </details>
        </div>
        )}
        </div>
        </div>
      </aside>

      <div className={styles.previewColumn}>
        {previewHeader}
        <div className={styles.canvasWrapper} ref={wrapperRef}>
        <div
          className={styles.scaledBox}
          style={{ height: format.height * scale }}
        >
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
              dateSchedules={formData.dateSchedules}
              onDateClick={onDateClick}
              fontFamily={fontOption.family}
              calendarLabelStyle={formData.calendarLabelStyle}
              titleTextStyle={formData.titleTextStyle}
              outputFormat={outputFormat}
              clinicHours={formData.clinicHours}
              reserveClinicHoursSpace={showClinicHoursGuide}
              designEdits={designEdits}
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

      {resetConfirm && (
        <Modal
          title={
            resetConfirm === 'schedule'
              ? '일정 설정 초기화'
              : resetConfirm === 'design'
                ? '디자인 설정 초기화'
                : '현재 월 전체 작업 초기화'
          }
          onClose={() => {
            setResetConfirm(null);
            setResetError(null);
          }}
        >
          <div className={styles.confirmContent}>
            {resetConfirm === 'schedule' ? (
              <>
                <p><strong>{formData.year}년 {formData.month}월의 일정 설정을 초기화할까요?</strong></p>
                <p>정기 휴진일, 휴가 기간, 날짜별 일정과 진료시간이 삭제됩니다.</p>
                <p>템플릿, 배경 이미지와 디자인 설정은 유지됩니다.</p>
              </>
            ) : resetConfirm === 'design' ? (
              <>
                <p><strong>현재 디자인 설정을 초기화할까요?</strong></p>
                <p>배경 이미지와 요소별 위치, 크기, 글꼴, 색상, 수정 문구가 초기화됩니다.</p>
                <p>일정, 진료시간, 병원 정보, 템플릿과 출력 규격은 유지됩니다.</p>
              </>
            ) : (
              <>
                <p><strong>{formData.year}년 {formData.month}월 작업을 모두 초기화할까요?</strong></p>
                <p>현재 월의 일정, 진료시간, 배경 이미지, 디자인, 맞춤 요청 입력과 템플릿이 초기화됩니다.</p>
                <p>병원 정보와 다른 연월에 저장된 일정은 유지됩니다.</p>
              </>
            )}
            {resetError && <p className={styles.resetError} role="alert">{resetError}</p>}
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setResetConfirm(null)}>취소</button>
              <button
                type="button"
                className={styles.confirmResetButton}
                onClick={async () => {
                  setResetError(null);
                  try {
                    if (resetConfirm === 'schedule') onResetSchedule();
                    else if (resetConfirm === 'design') await onResetDesign();
                    else await onResetAll();
                    setResetConfirm(null);
                  } catch {
                    setResetError('초기화하지 못했습니다. 잠시 후 다시 시도해 주세요.');
                  }
                }}
              >
                {resetConfirm === 'all' ? '현재 월 전체 초기화' : '초기화'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
});

export default SchedulePreview;
