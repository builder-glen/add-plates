import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { watchInstallPrompt } from './lib/a2hs';
import { applyTheme, loadPrefs } from './lib/prefs';

// 저장해 둔 테마(auto|light|dark)를 첫 페인트 전에 건다. 나중에 걸면 화면이 한 번 번쩍인다
applyTheme(loadPrefs().theme);

// 설치 안내 이벤트는 로드 직후 딱 한 번 온다 — 설정 화면이 열리기 전에 잡아 둔다
watchInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 홈 화면에 추가(A2HS)용 서비스워커
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
