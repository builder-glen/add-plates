import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ExercisesProvider, useExercises } from './data/exercises';
import { HomeScreen } from './features/home/HomeScreen';
import { LoginScreen } from './features/login/LoginScreen';
import './styles/global.css';

function AuthedApp() {
  const { error, reload } = useExercises();

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
        <HomeScreen />
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
