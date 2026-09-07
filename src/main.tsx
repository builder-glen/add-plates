import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { watchInstallPrompt } from './lib/a2hs';
import { applyTheme, loadPrefs } from './lib/prefs';
import { shareCodeFromLocation } from './lib/shareLink';

// 저장해 둔 테마(auto|light|dark)를 첫 페인트 전에 건다. 나중에 걸면 화면이 한 번 번쩍인다
applyTheme(loadPrefs().theme);

const root = createRoot(document.getElementById('root')!);

/**
 * 주소를 먼저 보고 인증 검사보다 앞서 갈라진다 (docs/share-spec.md).
 *
 * 두 갈래를 동적 import 로 나눈 이유는 코드 분할 자체가 아니라, 공유 화면에서
 * Supabase 모듈이 **읽히지도 않게** 하기 위해서다 — lib/supabase.ts 는 읽히는 순간
 * 클라이언트를 만들고, 그 클라이언트가 저장된 세션을 되살리며 토큰 갱신을 부른다.
 * 링크를 받은 사람의 화면에서 요청이 한 건이라도 나가면 안 된다.
 */
if (shareCodeFromLocation() !== null) {
  void import('./features/share/SharedScreen').then(({ SharedScreen }) => {
    root.render(
      <StrictMode>
        <SharedScreen />
      </StrictMode>,
    );
  });
} else {
  // 설치 안내 이벤트는 로드 직후 딱 한 번 온다 — 설정 화면이 열리기 전에 잡아 둔다
  watchInstallPrompt();

  void import('./App').then(({ App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });

  // 홈 화면에 추가(A2HS)용 서비스워커. 링크만 받아 본 사람에게까지 심지는 않는다
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js');
    });
  }
}
