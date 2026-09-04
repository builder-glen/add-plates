// 홈 화면에 추가(A2HS).
// 크롬 계열은 beforeinstallprompt 를 페이지 로드 직후 딱 한 번 던지므로
// 설정 화면이 열릴 때까지 기다리면 놓친다 — main.tsx 에서 미리 잡아 둔다.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

let deferred: InstallPromptEvent | null = null;

export function watchInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // 브라우저 기본 배너를 막고 설정 화면에서 우리가 띄운다
    deferred = e as InstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
  });
}

/** 이미 설치된 상태로 실행 중인지 */
export function isInstalled(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

/** 네이티브 설치 창을 띄운다. 띄울 수 없으면 false (사파리에는 이 API 가 없다) */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null; // 한 번 쓴 이벤트는 재사용할 수 없다
  try {
    await e.prompt();
    return true;
  } catch {
    return false;
  }
}
