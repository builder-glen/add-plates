import { useState } from 'react';
import { Snackbar, useSnack } from '../../components/Snackbar';
import { useAuth } from '../../auth/AuthProvider';
import { isInstalled, promptInstall } from '../../lib/a2hs';
import {
  THEMES,
  WEIGHT_STEPS,
  stepLabel,
  themeLabel,
  type Prefs,
  type Theme,
} from '../../lib/prefs';
import { OptionSheet } from './OptionSheet';
import '../../styles/settings.css';

type Sheet = 'theme' | 'step' | null;

interface Props {
  /** '178cm · 74.2kg · 9/1 측정' */
  summary: string;
  /** 직접 추가한 종목 수 */
  myCount: number;
  prefs: Prefs;
  onPrefsChange: (next: Prefs) => void;
  onOpenMe: () => void;
  onOpenExercises: () => void;
  onBack: () => void;
}

export function SettingsScreen({
  summary,
  myCount,
  prefs,
  onPrefsChange,
  onOpenMe,
  onOpenExercises,
  onBack,
}: Props) {
  const { session, signOut } = useAuth();
  const { snack, show, dismiss } = useSnack();
  const [sheet, setSheet] = useState<Sheet>(null);

  /** 크롬 계열은 네이티브 설치 창, 사파리는 API 자체가 없어 방법만 알려준다 */
  const install = () => {
    if (isInstalled()) {
      show('이미 홈 화면에서 실행 중이에요');
      return;
    }
    void promptInstall().then((opened) => {
      if (!opened) show('공유 버튼 → 홈 화면에 추가 를 누르면 설치돼요');
    });
  };

  return (
    <>
      <div className="gp-screen__head">
        <button type="button" className="gp-screen__back" aria-label="뒤로" onClick={onBack}>
          ‹
        </button>
        <span className="gp-screen__title">설정</span>
      </div>

      <div className="gp-screen__body gp-scroll gp-cfg">
        <button type="button" className="gp-cfg__profile" onClick={onOpenMe}>
          <span className="gp-cfg__avatar" />
          <span className="gp-cfg__profileText">
            <span className="gp-cfg__profileName">내 정보</span>
            <span className="gp-cfg__profileSummary gp-num">{summary}</span>
          </span>
          <span className="gp-cfg__chev">›</span>
        </button>

        <div className="gp-cfg__section">
          <div className="gp-micro gp-cfg__label">기록</div>
          <button type="button" className="gp-cfg__row" onClick={onOpenExercises}>
            <span>내 종목 관리</span>
            <span className="gp-cfg__value gp-num">{myCount}개 ›</span>
          </button>
          <button type="button" className="gp-cfg__row" onClick={() => setSheet('step')}>
            <span>무게 조절 단위</span>
            <span className="gp-cfg__value gp-num">{stepLabel(prefs.weightStep)} ›</span>
          </button>
        </div>

        <div className="gp-cfg__section">
          <div className="gp-micro gp-cfg__label">앱</div>
          <button type="button" className="gp-cfg__row" onClick={install}>
            <span>홈 화면에 추가하기</span>
            <span className="gp-cfg__value">›</span>
          </button>
          <button type="button" className="gp-cfg__row" onClick={() => setSheet('theme')}>
            <span>테마</span>
            <span className="gp-cfg__value">{themeLabel(prefs.theme)} ›</span>
          </button>
        </div>

        <div className="gp-cfg__account">
          <span className="gp-cfg__mail">{session?.user.email ?? ''}</span>
          <button type="button" className="gp-cfg__logout" onClick={() => void signOut()}>
            로그아웃
          </button>
          {/* CC BY-SA 4.0 은 출처 표기가 의무다 */}
          <p className="gp-cfg__credit">
            운동 일러스트: Everkinetic · Bryl Lim (
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA 4.0
            </a>
            )
          </p>
        </div>
      </div>

      {sheet === 'theme' ? (
        <OptionSheet<Theme>
          title="테마"
          options={THEMES}
          value={prefs.theme}
          onPick={(theme) => onPrefsChange({ ...prefs, theme })}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === 'step' ? (
        <OptionSheet<number>
          title="무게 조절 단위"
          options={WEIGHT_STEPS.map((s) => ({ key: s, label: `${s}kg` }))}
          value={prefs.weightStep}
          onPick={(weightStep) => onPrefsChange({ ...prefs, weightStep })}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {snack ? <Snackbar snack={snack} onDismiss={dismiss} /> : null}
    </>
  );
}
