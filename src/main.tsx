import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// 테마 3값(auto|light|dark). 전환 UI 는 설정 화면(다음 차수)에 붙는다
document.documentElement.dataset.theme = 'auto';

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
