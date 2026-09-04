import { useEffect, useMemo, useState } from 'react';
import { useExercises } from '../../data/exercises';
import { fetchRecentExerciseIds } from '../../data/queries';
import {
  MAX_RECENT,
  MAX_RESULTS,
  filterPool,
  searchExercises,
  type PickerFilter,
} from '../../data/search';
import { EQUIP_LABEL, MUSCLE_LABEL, SUB_LABEL } from '../../lib/labels';
import { useDragScroll } from '../../lib/useDragScroll';
import { useSheetDrag } from '../../lib/useSheetDrag';
import type { Equipment, Exercise, MuscleGroup, SubRegion } from '../../lib/types';
import '../../styles/picker.css';

const GROUPS = Object.keys(MUSCLE_LABEL) as MuscleGroup[];
const SUB_ORDER = Object.keys(SUB_LABEL) as SubRegion[];
const EQUIP_ORDER = Object.keys(EQUIP_LABEL) as Equipment[];

const EMPTY_FILTER: PickerFilter = { group: null, sub: null, equip: null };

type RecentState = { status: 'loading' | 'ready' | 'error'; ids: string[] };

interface Props {
  onPick: (ex: Exercise) => void;
  /** 결과가 없을 때 직접 추가 폼으로. 친 글자를 넘긴다 */
  onCustom: (name: string) => void;
  onClose: () => void;
}

export function PickerSheet({ onPick, onCustom, onClose }: Props) {
  const { all, byId } = useExercises();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PickerFilter>(EMPTY_FILTER);
  const [recent, setRecent] = useState<RecentState>({ status: 'loading', ids: [] });
  const [reload, setReload] = useState(0);

  const drag = useDragScroll();
  const sheet = useSheetDrag(onClose);

  // 최근 사용은 기록에서만 나온다 — 시트를 열 때 한 번만 부른다
  useEffect(() => {
    let alive = true;
    setRecent({ status: 'loading', ids: [] });
    fetchRecentExerciseIds(MAX_RECENT)
      .then((ids) => alive && setRecent({ status: 'ready', ids }))
      .catch(() => alive && setRecent({ status: 'error', ids: [] }));
    return () => {
      alive = false;
    };
  }, [reload]);

  // 선택한 부위에 실제로 존재하는 세부 부위만 (general·null 은 칩을 만들지 않는다)
  const subs = useMemo(() => {
    if (!filter.group) return [];
    const present = new Set(
      all
        .filter((e) => e.muscle_group === filter.group && !e.is_hidden)
        .map((e) => e.sub_region)
        .filter((s): s is SubRegion => !!s && s !== 'general'),
    );
    return SUB_ORDER.filter((s) => present.has(s));
  }, [all, filter.group]);

  const equips = useMemo(() => {
    const present = new Set(all.filter((e) => !e.is_hidden).map((e) => e.equipment));
    return EQUIP_ORDER.filter((q) => present.has(q));
  }, [all]);

  const q = query.trim();
  const hasFilter = !!(filter.group || filter.sub || filter.equip);
  const pool = useMemo(() => filterPool(all, filter), [all, filter]);

  const recentList = useMemo(
    () =>
      recent.ids
        .map((id) => byId.get(id))
        .filter((e): e is Exercise => !!e && !e.is_hidden)
        .slice(0, MAX_RECENT),
    [recent.ids, byId],
  );

  let results: Exercise[];
  let label: string;
  if (q) {
    results = searchExercises(all, query, filter);
    label = results.length ? `검색 결과 ${results.length}개` : '';
  } else if (!hasFilter && recentList.length) {
    results = recentList;
    label = '최근에 한 종목';
  } else {
    // 처음 쓰는 사람이라 최근 종목이 없으면 부위 필터와 전체 목록이 먼저 보인다
    results = pool.slice(0, MAX_RESULTS);
    label = `종목 ${pool.length}개`;
  }

  const noResults = !!q && results.length === 0;
  const noMatch = !q && results.length === 0;
  const loadingRecent = !q && !hasFilter && recent.status === 'loading';

  const pickGroup = (g: MuscleGroup) =>
    setFilter((f) => (f.group === g ? { ...f, group: null, sub: null } : { ...f, group: g, sub: null }));

  return (
    <>
      <div className="gp-overlay" onClick={onClose} />
      <div
        className="gp-sheet gp-sheet--picker"
        ref={sheet.sheetRef}
        role="dialog"
        aria-label="종목 고르기"
      >
        <div className="gp-picker__head">
          <div className="gp-grab" {...sheet.handle} />

          <div className="gp-search">
            <span className="gp-search__label">찾기</span>
            <input
              className="gp-search__input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="종목 이름이나 초성"
              aria-label="종목 검색"
            />
            <button
              type="button"
              className="gp-search__clear"
              aria-label="검색어 지우기"
              onClick={() => setQuery('')}
            >
              ✕
            </button>
          </div>

          <div className="gp-filters">
            <div className="gp-filter">
              <span className="gp-filter__label">부위</span>
              <div className="gp-filter__row gp-scroll" {...drag}>
                <button
                  type="button"
                  className={`gp-fchip${!filter.group ? ' gp-fchip--on' : ''}`}
                  onClick={() => setFilter((f) => ({ ...f, group: null, sub: null }))}
                >
                  전체
                </button>
                {GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`gp-fchip${filter.group === g ? ' gp-fchip--on' : ''}`}
                    onClick={() => pickGroup(g)}
                  >
                    {filter.group === g ? `${MUSCLE_LABEL[g]} ✕` : MUSCLE_LABEL[g]}
                  </button>
                ))}
              </div>
            </div>

            {subs.length ? (
              <div className="gp-filter">
                <span className="gp-filter__label">세부</span>
                <div className="gp-filter__row gp-scroll" {...drag}>
                  {subs.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`gp-fchip${filter.sub === s ? ' gp-fchip--on' : ''}`}
                      onClick={() => setFilter((f) => ({ ...f, sub: f.sub === s ? null : s }))}
                    >
                      {SUB_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="gp-filter gp-filter--equip">
              <span className="gp-filter__label">기구</span>
              <div className="gp-filter__row gp-scroll" {...drag}>
                {equips.map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    className={`gp-fchip${filter.equip === eq ? ' gp-fchip--on' : ''}`}
                    onClick={() => setFilter((f) => ({ ...f, equip: f.equip === eq ? null : eq }))}
                  >
                    {EQUIP_LABEL[eq]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="gp-picker__body gp-scroll">
          {label ? <div className="gp-micro gp-res__label">{label}</div> : null}

          {loadingRecent ? <div className="gp-note">불러오는 중…</div> : null}

          {!q && !hasFilter && recent.status === 'error' ? (
            <div className="gp-note gp-note--warn">
              최근 종목을 불러오지 못했어요.{' '}
              <button type="button" className="gp-retry" onClick={() => setReload((n) => n + 1)}>
                다시 시도
              </button>
            </div>
          ) : null}

          {results.map((ex) => {
            const sub = ex.sub_region ? SUB_LABEL[ex.sub_region] : null;
            return (
              <button key={ex.id} type="button" className="gp-res" onClick={() => onPick(ex)}>
                <span className="gp-res__thumb" />
                <span className="gp-res__text">
                  <span className="gp-res__name">{ex.name}</span>
                  <span className="gp-res__desc">
                    {[MUSCLE_LABEL[ex.muscle_group], sub].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="gp-res__meta">{EQUIP_LABEL[ex.equipment]}</span>
              </button>
            );
          })}

          {noMatch && !loadingRecent ? (
            <div className="gp-picker__none">
              <span className="gp-picker__none-msg">이 조건에 맞는 종목이 없어요</span>
              <button
                type="button"
                className="gp-btn-outline"
                onClick={() => setFilter(EMPTY_FILTER)}
              >
                필터 지우기
              </button>
              <span className="gp-picker__none-hint">부위·세부·기구 선택을 모두 해제해요</span>
            </div>
          ) : null}

          {noResults ? (
            <div className="gp-picker__none">
              <span className="gp-picker__none-msg">이 이름은 아직 목록에 없어요</span>
              <button type="button" className="gp-btn-dark" onClick={() => onCustom(q)}>
                ＋ ‘{q}’ 직접 추가
              </button>
              <span className="gp-picker__none-hint">추가하면 바로 오늘 기록에 들어가요</span>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
