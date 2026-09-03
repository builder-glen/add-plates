import { useRef, useState } from 'react';
import type { DayEntry, DaySet } from '../../lib/types';
import { EQUIP_LABEL, MUSCLE_HUE, MUSCLE_LABEL, SUB_LABEL } from '../../lib/labels';
import { fmtWeight, summarizeSets } from '../../data/queries';
import { ChevronIcon, TrashIcon } from './icons';

const OPEN_X = -88; // 삭제 패널 폭
const MAX_X = -104;
const THRESHOLD = -44;

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
              return (
                <div
                  key={s.id}
                  className={`gp-set${failed ? ' gp-set--fail' : ''}`}
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
                    {isBody || s.weight_kg == null ? '맨몸' : `${fmtWeight(s.weight_kg)} kg`}
                  </span>
                  <span className="gp-set__val gp-num">{s.reps} 회</span>
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
                  ) : (
                    <span className="gp-set__state">{s.sync === 'pending' ? '저장 중' : '✓'}</span>
                  )}
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
