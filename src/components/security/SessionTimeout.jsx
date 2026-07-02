import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { isDemoReceptionistSession } from '@/features/receptionist/utils/receptionistPortal';

const IDLE_MS = 30 * 60 * 1000;
const WARNING_MS = 60 * 1000;

export default function SessionTimeout() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    idleTimerRef.current = null;
    warningTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const forceLogout = useCallback(() => {
    const returnToReceptionLogin = isDemoReceptionistSession(user);
    clearTimers();
    setWarningOpen(false);
    logout();
    navigate(returnToReceptionLogin ? ROUTES.RECEPTIONIST_LOGIN : ROUTES.LOGIN, { replace: true });
  }, [clearTimers, logout, navigate, user]);

  const startWarningCountdown = useCallback(() => {
    setSecondsLeft(60);
    setWarningOpen(true);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      forceLogout();
    }, WARNING_MS);
  }, [forceLogout]);

  const resetIdleTimer = useCallback(() => {
    if (!isAuthenticated) return;
    clearTimers();
    setWarningOpen(false);
    idleTimerRef.current = setTimeout(() => {
      startWarningCountdown();
    }, IDLE_MS);
  }, [isAuthenticated, clearTimers, startWarningCountdown]);

  const stayLoggedIn = () => {
    resetIdleTimer();
  };

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      setWarningOpen(false);
      return undefined;
    }

    resetIdleTimer();

    const events = ['mousemove', 'mousedown', 'keydown', 'click', 'touchstart', 'scroll'];
    const onActivity = () => {
      if (!warningOpen) resetIdleTimer();
    };

    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearTimers();
    };
  }, [isAuthenticated, warningOpen, resetIdleTimer, clearTimers]);

  if (!isAuthenticated) return null;

  return (
    <Modal
      isOpen={warningOpen}
      onClose={stayLoggedIn}
      title="Session expiring"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={forceLogout}>
            Log out now
          </Button>
          <Button onClick={stayLoggedIn}>Stay logged in</Button>
        </>
      }
    >
      <p style={{ margin: 0 }}>
        You will be logged out in <strong>{secondsLeft}</strong> seconds due to inactivity.
      </p>
    </Modal>
  );
}
