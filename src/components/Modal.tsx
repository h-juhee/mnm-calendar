import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  closable?: boolean;
  panelClassName?: string;
  backdropClassName?: string;
  descriptionId?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  leadingVisual?: ReactNode;
  titleClassName?: string;
}

export default function Modal({
  title,
  onClose,
  children,
  closable = true,
  panelClassName,
  backdropClassName,
  descriptionId,
  initialFocusRef,
  leadingVisual,
  titleClassName,
}: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  // Parents commonly pass an inline close callback. Keep the latest callback
  // without re-running the initial-focus effect whenever form state changes.
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      if (initialFocusRef?.current && window.matchMedia('(min-width: 768px)').matches) {
        initialFocusRef.current.focus();
      } else if (closable) {
        closeButtonRef.current?.focus();
      } else {
        panelRef.current?.focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closable && e.key === 'Escape') onCloseRef.current();
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null);

      if (focusable.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (e.shiftKey && (activeElement === first || activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (activeElement === last || activeElement === panelRef.current)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [closable, initialFocusRef]);

  return createPortal(
    <div
      className={`${styles.backdrop}${backdropClassName ? ` ${backdropClassName}` : ''}`}
      onMouseDown={(e) => {
        if (closable && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`${styles.panel}${panelClassName ? ` ${panelClassName}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className={`${styles.header}${leadingVisual ? ` ${styles.headerWithVisual}` : ''}`}>
          {leadingVisual}
          <h2 id={titleId} className={`${styles.title}${titleClassName ? ` ${titleClassName}` : ''}`}>{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={closable ? styles.closeButton : styles.closeButtonHidden}
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
