import React, { useEffect, useRef, useState } from 'react';
import './Toast.css';

const EXIT_MS = 220;

/**
 * Lightweight floating toast. Parent controls visibility via `open`.
 * @param {'success' | 'error'} [type]
 */
export default function Toast({
  open,
  message,
  type = 'success',
  duration = 2800,
  onClose,
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const exitTimer = useRef(null);
  const autoTimer = useRef(null);

  const clearTimers = () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    if (autoTimer.current) clearTimeout(autoTimer.current);
  };

  const beginClose = () => {
    setExiting(true);
    exitTimer.current = setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onClose?.();
    }, EXIT_MS);
  };

  useEffect(() => {
    clearTimers();
    if (!open || !message) {
      setVisible(false);
      setExiting(false);
      return undefined;
    }

    setVisible(true);
    setExiting(false);
    if (duration > 0) {
      autoTimer.current = setTimeout(beginClose, duration);
    }

    return clearTimers;
  }, [open, message, duration]);

  if (!visible || !message) return null;

  const icon = type === 'error' ? '!' : '✓';

  return (
    <div
      className={`toast toast-${type}${exiting ? ' exiting' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="toast-body">
        <p className="toast-message">{message}</p>
      </div>
      <button
        type="button"
        className="toast-dismiss"
        onClick={beginClose}
        aria-label="סגור"
      >
        ×
      </button>
    </div>
  );
}
