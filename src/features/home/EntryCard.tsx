import { useRef, useState } from 'react';
import type { DayEntry, DaySet } from '../../lib/types';
import { EQUIP_LABEL, MUSCLE_HUE, MUSCLE_LABEL, SUB_LABEL } from '../../lib/labels';
import { fmtWeight, summarizeSets } from '../../data/queries';
import { ChevronIcon, TrashIcon, XIcon } from './icons';

const OPEN_X = -88; // 삭제 패널 폭
const MAX_X = -104;
const THRESHOLD = -44;

/**
 * 슬롯 릴에 쓸 가짜 숫자 3개.
 * 세트 id 로 결정하므로 리렌더가 나도 굴러가는 숫자가 바뀌지 않는다.
 * 실제 값과 그럴듯하게 붙어 있어야 "굴러서 멈췄다"로 읽힌다.
 */
function reelPool(id: string, final: number, step: number): number[] {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return [0, 1, 2].map((i) => {
    const off = ((h >> (i * 5)) % 7) - 3 || 4; // 0 이면 4 로 밀어 실제 값과 겹치지 않게
    return Math.max(step, final + off * step);
  });
}

function Reel({ id, value, step }: { id: string; value: number; step: number }) {
  return (
    <span className="gp-reel">
      {/* 폭을 진짜 값으로 고정한다. 안 하면 릴 상자가 가장 넓은 가짜 숫자
          (70 인데 92.5 같은)에 맞춰져, 굴러 멈춘 뒤 남은 폭이 단위 앞
          공백처럼 보인다. */}
      <span className="gp-reel__w">{fmtWeight(value)}</span>
      {/* 진짜 값이 맨 앞이다. transform 이 없는 기본 위치가 곧 정답이라
          애니메이션이 끊겨도 틀린 숫자가 남지 않는다. */}
      <span className="gp-reel__strip">
        <span className="gp-reel__cell">{fmtWeight(value)}</span>
        {reelPool(id, value, step).map((v, i) => (
          <span className="gp-reel__cell" key={i}>
            {fmtWeight(v)}
          </span>
        ))}
      </span>
    </span>
  );
}

interface Props {
  entry: DayEntry;
  expanded: boolean;
  swiped: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onSwipe: (open: boolean) => void;
  onDelete: () => void;
  onRepeat: () => void;
  onOpenEditor: (setNo: number | null) => void;
  onRetrySet: (setId: string) => void;
  onDeleteSet: (setId: string, setNo: number) => void;
}

export function EntryCard({
  entry,
  expanded,
  swiped,
  readOnly,
  onToggle,
  onSwipe,
  onDelete,
  onRepeat,
  onOpenEditor,
  onRetrySet,
  onDeleteSet,
}: Props) {
  const [dx, setDx] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);

  const ex = entry.exercise;
  const isBody = ex.tracking_type === 'bodyweight_reps';
  const hue = MUSCLE_HUE[ex.muscle_group];
  const subLabel = ex.sub_region ? SUB_LABEL[ex.sub_region] : null;

  const chips: { text: string; strong: boolean }[] = [
    { text: MUSCLE_LABEL[ex.muscle_group], strong: true },
    ...(subLabel ? [{ text: subLabel, strong: false }] : []),
    { text: EQUIP_LABEL[ex.equipment], strong: false },
  ];

  const lastSet: DaySet | undefined = entry.sets[entry.sets.length - 1];
  const volume =
    !isBody && entry.sets.length
      ? `총 ${entry.sets.reduce((a, s) => a + (s.weight_kg ?? 0) * s.reps, 0).toLocaleString()}kg`
      : '';

  const shift = dx !== null ? dx : swiped ? OPEN_X : 0;
  const panelVisible = swiped || (dx !== null && dx < -2);

  /**
   * 슬롯 연출 대상: "지금 담은" 세트만이다.
   * 최초 렌더에 이미 있던 세트(불러온 기록)는 담아 둔 것으로 치고 연출하지 않는다.
   * 연출이 끝난 세트는 onAnimationEnd 에서 목록에 넣어, 접었다 펴도 다시 번쩍이지 않게 한다.
   */
  const seenRef = useRef<Set<string> | null>(null);
  if (seenRef.current === null) seenRef.current = new Set(entry.sets.map((s) => s.id));
  const seen = seenRef.current;

  const onPointerDown = (ev: React.PointerEvent) => {
    if (readOnly) return;
    start.current = { x: ev.clientX, y: ev.clientY, base: swiped ? OPEN_X : 0 };
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const d = ev.clientX - s.x;
    if (Math.abs(d) < 6 || Math.abs(ev.clientY - s.y) > Math.abs(d)) return;
    setDx(Math.max(MAX_X, Math.min(0, s.base + d)));
  };

  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    if (dx === null) return;
    onSwipe(dx < THRESHOLD);
    setDx(null);
  };

  // 열린 상태에서 카드를 누르면 닫기만 한다 (펼침으로 전달되지 않는다)
  const handleToggle = () => {
    if (swiped) {
      onSwipe(false);
      return;
    }
    onToggle();
  };

  return (
    <div className="gp-entry">
      <button
        type="button"
        className={`gp-entry__del${panelVisible ? ' gp-entry__del--on' : ''}`}
        aria-label={`${ex.name} 삭제`}
        tabIndex={panelVisible ? 0 : -1}
        onClick={onDelete}
      >
        <TrashIcon />
        삭제
      </button>

      <div
        className="gp-entry__card"
        style={{
          transform: `translateX(${shift}px)`,
          transition: dx !== null ? 'none' : 'transform 320ms cubic-bezier(.32,.72,0,1)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="gp-entry__head">
          <button
            type="button"
            className={`gp-caret${expanded ? ' gp-caret--open' : ''}`}
            aria-label={expanded ? '접기' : '펼치기'}
            aria-expanded={expanded}
            onClick={handleToggle}
          >
            <ChevronIcon />
          </button>

          {/* 종목 썸네일. 시트에서 고를 때 본 그림이 카드에도 그대로 있어야
              같은 종목이라는 게 바로 읽힌다. 여기서는 장식이라 버튼이 아니다 */}
          {ex.asset_slug ? (
            <span
              className="gp-entry__thumb"
              aria-hidden="true"
              style={{ ['--thumb-art' as string]: `url("/exercises/${ex.asset_slug}.svg")` }}
            />
          ) : (
            <span
              className="gp-entry__thumb gp-entry__thumb--mono"
              aria-hidden="true"
              style={{ ['--chip-h' as string]: String(hue) }}
            >
              {MUSCLE_LABEL[ex.muscle_group].slice(0, 1)}
            </span>
          )}

          <button type="button" className="gp-entry__title" onClick={handleToggle}>
            <span className="gp-entry__name">{ex.name}</span>
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
          </button>

          <span className="gp-entry__count gp-num">
            {entry.sets.length ? `${entry.sets.length}세트` : ''}
          </span>
        </div>

        {!expanded ? (
          <div className="gp-entry__summary">
            <b className="gp-num">
              {entry.sets.length ? summarizeSets(entry.sets) : '아직 세트가 없어요'}
            </b>
            {volume ? <i>{volume}</i> : null}
          </div>
        ) : (
          <div className="gp-entry__open">
            <div className="gp-entry__last">
              {entry.last
                ? `지난 기록 · ${entry.last.date} (${entry.last.daysAgo}일 전) ${entry.last.summary}`
                : '첫 기록이에요'}
            </div>

            {entry.sets.map((s) => {
              const failed = s.sync === 'fail';
              // 실패한 행에는 연출을 걸지 않는다 — 연출 중에 실패가 오면 그 자리에서 멈춘다
              const lock = !failed && !seen.has(s.id);
              return (
                <div
                  key={s.id}
                  className={`gp-set${failed ? ' gp-set--fail' : ''}${lock ? ' gp-set--lock' : ''}`}
                  // 연출이 4단계라 중간 단계가 끝날 때마다 여기가 불린다.
                  // 마지막 스파크가 끝났을 때만 기록해야 도중에 클래스가 떨어지지 않는다.
                  onAnimationEnd={(e) => {
                    if (e.animationName === 'gpSetSpark') seen.add(s.id);
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => !readOnly && onOpenEditor(s.set_no)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!readOnly) onOpenEditor(s.set_no);
                    }
                  }}
                >
                  <span className="gp-set__no gp-num">{s.set_no}</span>
                  <span className="gp-set__val gp-num">
                    {isBody || s.weight_kg == null ? (
                      '맨몸'
                    ) : lock ? (
                      <>
                        <Reel id={`${s.id}w`} value={s.weight_kg} step={2.5} /> kg
                      </>
                    ) : (
                      `${fmtWeight(s.weight_kg)} kg`
                    )}
                  </span>
                  <span className="gp-set__val gp-num">
                    {lock ? (
                      <>
                        <Reel id={`${s.id}r`} value={s.reps} step={1} /> 회
                      </>
                    ) : (
                      `${s.reps} 회`
                    )}
                  </span>
                  {failed ? (
                    <button
                      type="button"
                      className="gp-set__state gp-set__state--fail gp-retry"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetrySet(s.id);
                      }}
                    >
                      재시도
                    </button>
                  ) : s.sync === 'pending' ? (
                    <span className="gp-set__state">저장 중</span>
                  ) : readOnly ? null : (
                    <button
                      type="button"
                      className="gp-set__del"
                      aria-label={`${s.set_no}세트 삭제`}
                      onClick={(e) => {
                        // 행을 누르면 수정이 열린다. 삭제는 거기까지 번지면 안 된다
                        e.stopPropagation();
                        onDeleteSet(s.id, s.set_no);
                      }}
                    >
                      <XIcon size={13} />
                    </button>
                  )}
                  {/* 스파크 입자. box-shadow 로 여러 점을 찍으므로 요소는 이 하나면 된다 */}
                  {lock ? <span className="gp-set__fx" aria-hidden="true" /> : null}
                </div>
              );
            })}

            {!readOnly ? (
              <div className="gp-entry__actions">
                <button type="button" className="gp-btn-primary" onClick={onRepeat}>
                  {lastSet
                    ? isBody
                      ? `직전 세트 담기 · ${lastSet.reps}회`
                      : `직전 세트 담기 · ${fmtWeight(lastSet.weight_kg ?? 0)}kg × ${lastSet.reps}`
                    : '첫 세트 입력'}
                </button>
                <button type="button" className="gp-btn-ghost" onClick={() => onOpenEditor(null)}>
                  직접 입력
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
