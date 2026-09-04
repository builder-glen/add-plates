import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useExercises } from '../../data/exercises';
import { useBodyData } from '../../data/useBodyData';
import type { Prefs } from '../../lib/prefs';
import { MeScreen } from './MeScreen';
import { MyExercisesScreen } from './MyExercisesScreen';
import { SettingsScreen } from './SettingsScreen';
import { profileSummary } from './stats';
import '../../styles/settings.css';

/** 설정 아래 세 화면. 측정 이력을 한 번만 읽어 설정 요약과 내 정보가 같이 쓴다 */
type Sub = 'settings' | 'me' | 'exercises';

interface Props {
  prefs: Prefs;
  onPrefsChange: (next: Prefs) => void;
  /** 홈으로 */
  onClose: () => void;
}

export function SettingsRoot({ prefs, onPrefsChange, onClose }: Props) {
  const { userId } = useAuth();
  const { all } = useExercises();
  const body = useBodyData();
  const [sub, setSub] = useState<Sub>('settings');

  // 숨긴 종목은 사용자에겐 지운 것과 같다 — 목록에도 개수에도 넣지 않는다
  const mine = useMemo(
    () => all.filter((e) => e.owner_id === userId && !e.is_hidden),
    [all, userId],
  );

  return (
    <div className="gp-screen">
      {sub === 'settings' ? (
        <SettingsScreen
          summary={profileSummary(body.heightCm, body.rows)}
          myCount={mine.length}
          prefs={prefs}
          onPrefsChange={onPrefsChange}
          onOpenMe={() => setSub('me')}
          onOpenExercises={() => setSub('exercises')}
          onBack={onClose}
        />
      ) : null}

      {sub === 'me' ? <MeScreen body={body} onBack={() => setSub('settings')} /> : null}

      {sub === 'exercises' ? (
        <MyExercisesScreen mine={mine} onBack={() => setSub('settings')} />
      ) : null}
    </div>
  );
}
