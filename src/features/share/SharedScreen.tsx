// 공통 스타일이 화면 모듈보다 먼저 실려야 한다 (App.tsx 와 같은 이유).
// 이 화면은 App 을 거치지 않고 열리므로 여기서도 직접 맨 앞에 실어야 한다.
import '../../styles/global.css';
import { useEffect, useState } from 'react';
import { BrandMark } from '../home/BrandMark';
import { ChevronIcon } from '../home/icons';
import { fmtDateTitle } from '../../lib/date';
import { MUSCLE_HUE, MUSCLE_LABEL } from '../../lib/labels';
import { decodeShare, shareCodeFromLocation, type ShareExercise } from '../../lib/shareLink';
import { countsVolume, hasWeight, type MuscleGroup } from '../../lib/types';
import '../../styles/home.css';
import '../../styles/share.css';

/**
 * 화면 8 — 공유 보기 (`/s#<압축된 기록>`).
 *
 * 로그인 상태를 확인하지 않는다. Supabase 를 부르지도 않는다 —
 * 그리는 데 필요한 값이 전부 주소 안에 있다. 그래서 data/·auth/ 의
 * 어떤 모듈도 import 하지 않는다(그쪽은 모듈을 읽는 순간 클라이언트를 만든다).
 */

/** 링크에는 부위 '라벨'이 들어 있다 — 칩 색을 뽑으려면 되돌려야 한다 */
const HUE_BY_MUSCLE_LABEL: Record<string, number> = Object.fromEntries(
  (Object.keys(MUSCLE_LABEL) as MuscleGroup[]).map((g) => [MUSCLE_LABEL[g], MUSCLE_HUE[g]]),
);
/** 모르는 라벨(옛 링크·손댄 링크)이면 브랜드 hue 로 둔다 */
const FALLBACK_HUE = 156;

/** queries.ts 의 것과 같은 규칙. 그쪽은 supabase 를 끌고 와서 여기서 못 쓴다 */
const fmtWeight = (w: number) => (Number.isInteger(w) ? String(w) : String(Number(w.toFixed(1))));

/** 종목 총합. 볼륨에 안 들어가는 종목(맨몸·어시스트)은 횟수를 더한다 */
function totalOf(ex: ShareExercise): number {
  const vol = countsVolume(ex.t);
  return ex.s.reduce((a, [w, r]) => a + (vol ? (w ?? 0) * r : r), 0);
}

function Card({ ex }: { ex: ShareExercise }) {
  const [open, setOpen] = useState(false);
  const weighted = hasWeight(ex.t);
  const volume = countsVolume(ex.t);
  const isAssist = ex.t === 'assist_reps';
  const hue = HUE_BY_MUSCLE_LABEL[ex.m] ?? FALLBACK_HUE;
  const chips = [
    { text: ex.m, strong: true },
    { text: ex.q, strong: false },
  ].filter((c) => c.text);

  return (
    <div className="gp-entry">
      <div className="gp-entry__card">
        {/* 받는 쪽에는 스와이프 삭제도 편집 시트도 없다 — 헤더 전체가 펼침 버튼 하나다 */}
        <button
          type="button"
          className="gp-entry__head"
          aria-label={open ? '접기' : '세트 펼치기'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`gp-caret${open ? ' gp-caret--open' : ''}`}>
            <ChevronIcon size={14} />
          </span>

          {ex.a ? (
            <span
              className="gp-entry__thumb"
              aria-hidden="true"
              style={{ ['--thumb-art' as string]: `url("/exercises/${ex.a}.svg")` }}
            />
          ) : (
            <span
              className="gp-entry__thumb gp-entry__thumb--mono"
              aria-hidden="true"
              style={{ ['--chip-h' as string]: String(hue) }}
            >
              {ex.m.slice(0, 1)}
            </span>
          )}

          <span className="gp-entry__title">
            <span className="gp-entry__name">{ex.n}</span>
            <span className="gp-chips">
              {chips.map((c) => (
                <span
                  key={c.text}
                  className={`gp-chip${c.strong ? ' gp-chip--strong' : ''}`}
                  style={{ ['--chip-h' as string]: String(hue) }}
                >
                  {c.text}
                </span>
              ))}
            </span>
          </span>

          <span className="gp-entry__stat">
            <span className="gp-entry__count gp-num">{ex.s.length}세트</span>
            <span className="gp-entry__vol">
              <span>총</span>
              <span className="gp-entry__volNum gp-num">{totalOf(ex).toLocaleString()}</span>
              <span className="gp-entry__volUnit">{volume ? 'kg' : '회'}</span>
            </span>
          </span>
        </button>

        {open ? (
          <div className="gp-entry__open">
            {ex.s.map(([w, r], i) => (
              <div className="gp-set" key={i}>
                <span className="gp-set__no gp-num">{i + 1}</span>
                <span className="gp-set__val gp-num">
                  {!weighted || w == null ? '맨몸' : `${isAssist ? '보조 ' : ''}${fmtWeight(w)} kg`}
                </span>
                <span className="gp-set__val gp-num">{r} 회</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type View =
  | { kind: 'loading' }
  | { kind: 'bad' }
  | { kind: 'ok'; date: string; entries: ShareExercise[] };

export function SharedScreen() {
  const [view, setView] = useState<View>({ kind: 'loading' });

  useEffect(() => {
    let alive = true;
    const code = shareCodeFromLocation() ?? '';
    void decodeShare(code).then((payload) => {
      if (!alive) return;
      // 세트가 하나도 없는 링크는 앱이 만들 수 없다 — 손상된 것으로 본다
      setView(
        payload && payload.e.length
          ? { kind: 'ok', date: payload.d, entries: payload.e }
          : { kind: 'bad' },
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  // 해제는 한 틱이면 끝난다. 그 사이에 문구를 비췄다 지우지 않는다
  if (view.kind === 'loading') return <div className="gp-app gp-shared" />;

  if (view.kind === 'bad') {
    return (
      <div className="gp-app gp-shared">
        <div className="gp-shared__bad">링크가 올바르지 않아요</div>
      </div>
    );
  }

  let sets = 0;
  let kg = 0;
  for (const ex of view.entries) {
    sets += ex.s.length;
    if (countsVolume(ex.t)) kg += totalOf(ex);
  }

  return (
    <div className="gp-app gp-shared">
      <div className="gp-head">
        <BrandMark />
        <span className="gp-shared__tag">SHARED LOG</span>
      </div>

      <div className="gp-head__rule" />

      <div className="gp-shared__meta">
        {/* 디자인은 여기에 공유자 이름을 넣지만 링크에 이름을 담지 않는다
            (구글 계정 이름을 그대로 노출하게 된다 — docs/share-spec.md) */}
        <span className="gp-micro">[오운완💪] 이 날의 기록</span>
        <span className="gp-shared__date">{fmtDateTitle(view.date)}</span>
        <span className="gp-shared__stat">
          <b className="gp-num">{view.entries.length}</b>종목 <b className="gp-num">{sets}</b>세트,
          {/* 맨몸·어시스트만 담긴 링크는 볼륨이 0 이다 */}
          {kg > 0 ? (
            <>
              총 <b className="gp-num">{kg.toLocaleString()}</b>kg를 이겨냈어요!
            </>
          ) : (
            '오늘도 해냈어요!'
          )}
        </span>
      </div>

      <div className="gp-body gp-scroll">
        {view.entries.map((ex, i) => (
          <Card key={i} ex={ex} />
        ))}
        <div className="gp-shared__note">
          받은 기록은 읽기 전용이에요. 무게·세트 값은 기록한 사람만 고칠 수 있어요.
        </div>
      </div>

      <div className="gp-foot">
        <button
          type="button"
          className="gp-foot__btn"
          onClick={() => {
            window.location.href = '/';
          }}
        >
          질수없지, 나도 운동 기록 시작하기
        </button>
        <span className="gp-shared__cap">add-plates.dev</span>
      </div>
    </div>
  );
}
