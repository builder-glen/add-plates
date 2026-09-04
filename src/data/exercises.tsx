import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import type { Exercise } from '../lib/types';

interface ExercisesValue {
  byId: Map<string, Exercise>;
  all: Exercise[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** 직접 추가한 종목을 다시 불러오지 않고 목록에 끼워 넣는다 */
  addLocal: (ex: Exercise) => void;
  /** 내 종목 관리에서 고친 값을 반영한다 (숨김 처리도 이 경로) */
  updateLocal: (ex: Exercise) => void;
  /** 내 종목 관리에서 지운 종목을 목록에서 뺀다 */
  removeLocal: (id: string) => void;
}

const Ctx = createContext<ExercisesValue | null>(null);

/**
 * 종목 마스터 204개를 앱 시작 시 전량 메모리에 올린다.
 * 초성은 DB에 이미 계산돼 있으므로 클라이언트에서 다시 만들지 않는다.
 */
export function ExercisesProvider({ children }: { children: React.ReactNode }) {
  const [all, setAll] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    requireSupabase()
      .from('exercises')
      .select(
        'id, name, chosung, aliases, alias_chosung, muscle_group, sub_region, equipment, tracking_type, asset_slug, owner_id, is_hidden',
      )
      .order('name')
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) setError('종목 목록을 불러오지 못했어요.');
        else setAll((data ?? []) as Exercise[]);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const addLocal = useCallback((ex: Exercise) => {
    setAll((prev) => [...prev, ex].sort((a, b) => a.name.localeCompare(b.name, 'ko')));
  }, []);

  const updateLocal = useCallback((ex: Exercise) => {
    setAll((prev) => prev.map((e) => (e.id === ex.id ? ex : e)));
  }, []);

  const removeLocal = useCallback((id: string) => {
    setAll((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const value = useMemo<ExercisesValue>(
    () => ({
      all,
      byId: new Map(all.map((e) => [e.id, e])),
      loading,
      error,
      reload,
      addLocal,
      updateLocal,
      removeLocal,
    }),
    [all, loading, error, reload, addLocal, updateLocal, removeLocal],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExercises(): ExercisesValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('ExercisesProvider 밖에서 useExercises 를 호출했습니다.');
  return v;
}
