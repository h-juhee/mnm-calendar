import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  closable?: boolean;
  panelClassName?: string;
}

export default function Modal({ title, onClose, children, closable = true, panelClassName }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  // Parents commonly pass an inline close callback. Keep the latest callback
  // without re-running the initial-focus effect whenever form state changes.
  onCloseRef.current = onClose;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (closable && e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closable]);

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (closable && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`${styles.panel}${panelClassName ? ` ${panelClassName}` : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
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
    </div>
  );
}
