import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ExercisesProvider, useExercises } from './data/exercises';
import { HomeScreen } from './features/home/HomeScreen';
import { LoginScreen } from './features/login/LoginScreen';
import { SettingsRoot } from './features/settings/SettingsRoot';
import { applyTheme, loadPrefs, savePrefs, type Prefs } from './lib/prefs';
import './styles/global.css';

function AuthedApp() {
  const { error, reload } = useExercises();
  // 테마·무게 단위는 기기별 취향이라 localStorage 에만 둔다 (lib/prefs.ts)
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    applyTheme(prefs.theme);
  }, [prefs.theme]);

  const changePrefs = (next: Prefs) => {
    setPrefs(next);
    savePrefs(next);
  };

  return (
    <div className="gp-app">
      {error ? (
        <div className="gp-body">
          <div className="gp-note gp-note--warn">
            {error}{' '}
            <button type="button" className="gp-retry" onClick={reload}>
              다시 시도
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 설정은 홈 위에 덮는다 — 돌아왔을 때 보던 날짜와 기록이 그대로 남는다 */}
          <HomeScreen weightStep={prefs.weightStep} onOpenSettings={() => setSettings(true)} />
          {settings ? (
            <SettingsRoot
              prefs={prefs}
              onPrefsChange={changePrefs}
              onClose={() => setSettings(false)}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function Root() {
  const { session, loading } = useAuth();

  // 세션 복구 중에는 로그인 화면을 잠깐 비추지 않는다
  if (loading) return <div className="gp-app" />;

  if (!session) return <LoginScreen />;

  return (
    <ExercisesProvider>
      <AuthedApp />
    </ExercisesProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
