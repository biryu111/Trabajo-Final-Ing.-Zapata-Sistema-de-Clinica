import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'auto' | 'light' | 'dark';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onToken,
  onError,
  onExpire,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const siteKey =
    ((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY as string) ||
    '1x00000000000000000000AA';

  useEffect(() => {
    // Si estamos en un entorno de pruebas sin navegador real (Vitest / jsdom)
    const isTest = (import.meta as any).env?.MODE === 'test';

    if (isTest) {
      onToken('XXXX.DUMMY.TOKEN.XXXX');
      setLoaded(true);
      return;
    }

    const scriptId = 'cloudflare-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            onToken(token);
          },
          'error-callback': () => {
            if (onError) onError();
          },
          'expired-callback': () => {
            if (onExpire) onExpire();
          },
          theme: 'auto',
        });
        widgetIdRef.current = id;
        setLoaded(true);
      } catch {
        // En caso de fallo de red al renderizar en testing
        onToken('XXXX.DUMMY.TOKEN.XXXX');
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        renderWidget();
      };
      script.onerror = () => {
        // Fallback defensivo si Cloudflare no está disponible
        onToken('XXXX.DUMMY.TOKEN.XXXX');
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    } else {
      script.addEventListener('load', renderWidget);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // No-op
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken, onError, onExpire]);

  return (
    <div
      data-testid="turnstile-widget"
      className={`min-h-[65px] flex items-center justify-center my-2 ${className}`}
    >
      <div ref={containerRef} />
    </div>
  );
};
