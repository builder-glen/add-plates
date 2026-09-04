import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import type { BodyMeasurement } from '../lib/types';
import * as q from './queries';
import type { LoadStatus } from './useDayData';

/** 측정 이력 + 키. 설정과 내 정보가 같은 값을 보므로 한 번만 읽어 함께 쓴다 */
export function useBodyData() {
  const { userId } = useAuth();

  const [rows, setRows] = useState<BodyMeasurement[]>([]); // 최신순
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  // 낙관적 업데이트는 다음 값을 그 자리에서 계산해야 한다 (useDayData 와 같은 이유)
  const ref = useRef<BodyMeasurement[]>([]);
  const commit = useCallback((next: BodyMeasurement[]) => {
    ref.current = next;
    setRows(next);
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [meas, height] = await Promise.all([q.fetchMeasurements(), q.fetchHeightCm()]);
      commit(meas);
      setHeightCm(height);
      setStatus('ready');
      setError(null);
    } catch {
      // 목록 자리에 재시도 버튼을 그린다. error 는 쓰기 실패 전용이다
      setStatus('error');
    }
  }, [commit]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortDesc = (list: BodyMeasurement[]) =>
    [...list].sort((a, b) => (a.measured_at < b.measured_at ? 1 : -1));

  /** 측정 추가. 값이 없는 칸은 0 이 아니라 null 로 넣는다 */
  const addMeasurement = useCallback(
    (weightKg: number | null, muscleKg: number | null, fatPct: number | null) => {
      if (!userId) return;
      const row: BodyMeasurement = {
        id: crypto.randomUUID(),
        user_id: userId,
        measured_at: new Date().toISOString(),
        weight_kg: weightKg,
        skeletal_muscle_kg: muscleKg,
        body_fat_pct: fatPct,
      };
      commit(sortDesc([row, ...ref.current]));

      void (async () => {
        try {
          await q.insertMeasurement(row);
        } catch {
          commit(ref.current.filter((r) => r.id !== row.id));
          setError('측정 기록을 저장하지 못했어요.');
        }
      })();
    },
    [userId, commit],
  );

  const removeMeasurement = useCallback(
    (row: BodyMeasurement) => {
      commit(ref.current.filter((r) => r.id !== row.id));

      void (async () => {
        try {
          await q.deleteMeasurement(row.id);
        } catch {
          setError('측정 기록을 지우지 못했어요.');
          void load();
        }
      })();
    },
    [commit, load],
  );

  /** 실행취소 — 같은 id 로 되돌린다 */
  const restoreMeasurement = useCallback(
    (row: BodyMeasurement) => {
      commit(sortDesc([row, ...ref.current]));

      void (async () => {
        try {
          await q.insertMeasurement(row);
        } catch {
          setError('되돌리지 못했어요.');
          void load();
        }
      })();
    },
    [commit, load],
  );

  const saveHeight = useCallback(
    (cm: number) => {
      if (!userId) return;
      const before = heightCm;
      setHeightCm(cm);

      void (async () => {
        try {
          await q.upsertHeightCm(userId, cm);
        } catch {
          setHeightCm(before);
          setError('키를 저장하지 못했어요.');
        }
      })();
    },
    [userId, heightCm],
  );

  return {
    rows,
    heightCm,
    status,
    error,
    clearError: () => setError(null),
    reload: load,
    addMeasurement,
    removeMeasurement,
    restoreMeasurement,
    saveHeight,
  };
}

export type BodyData = ReturnType<typeof useBodyData>;
