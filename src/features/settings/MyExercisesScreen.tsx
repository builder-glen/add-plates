import { useEffect, useState } from 'react';
import { ConfirmDialog, type Confirm } from '../../components/ConfirmDialog';
import { Snackbar, useSnack } from '../../components/Snackbar';
import { useExercises } from '../../data/exercises';
import {
  deleteExercise,
  fetchUsedExerciseIds,
  setExerciseHidden,
  updateExercise,
  type ExercisePatch,
} from '../../data/queries';
import { EQUIP_LABEL, MUSCLE_LABEL, TRACK_LABEL } from '../../lib/labels';
import type { Exercise } from '../../lib/types';
import { PencilIcon, TrashIcon } from '../home/icons';
import { CustomExerciseSheet } from '../picker/CustomExerciseSheet';
import '../../styles/settings.css';

interface Props {
  /** 직접 추가한 종목(숨김 제외). 개수 표시와 같은 목록을 쓴다 */
  mine: Exercise[];
  onBack: () => void;
}

export function MyExercisesScreen({ mine, onBack }: Props) {
  const { addLocal, updateLocal, removeLocal } = useExercises();
  const { snack, show, dismiss } = useSnack();
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** 기록에 이미 쓰인 종목은 지우는 대신 숨긴다 (PRD F-07) — 화면을 열 때 한 번 확인한다 */
  const [used, setUsed] = useState<Set<string> | null>(null);
  useEffect(() => {
    let alive = true;
    fetchUsedExerciseIds(mine.map((e) => e.id))
      .then((ids) => alive && setUsed(ids))
      .catch(() => alive && setUsed(new Set()));
    return () => {
      alive = false;
    };
    // 목록이 바뀔 때마다 다시 묻지 않는다. 화면을 열 때의 집합이면 충분하다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (ex: Exercise, patch: ExercisePatch) => {
    await updateExercise(ex.id, patch);
    updateLocal({ ...ex, ...patch });
    setEditing(null);
    show(`${patch.name} 저장됨`);
  };

  /** 숨김은 되돌릴 수 있고, 삭제는 되돌릴 수 없다 */
  const hide = (ex: Exercise) => {
    updateLocal({ ...ex, is_hidden: true });
    void setExerciseHidden(ex.id, true).catch(() => {
      updateLocal(ex);
      setError('종목을 숨기지 못했어요.');
    });
    show(`${ex.name} 숨김`, () => {
      updateLocal({ ...ex, is_hidden: false });
      void setExerciseHidden(ex.id, false).catch(() => {
        updateLocal({ ...ex, is_hidden: true });
        setError('되돌리지 못했어요.');
      });
    });
  };

  const remove = (ex: Exercise) => {
    removeLocal(ex.id);
    void deleteExercise(ex.id).catch(() => {
      addLocal(ex);
      setError('종목을 지우지 못했어요.');
    });
    show(`${ex.name} 삭제됨`);
  };

  const askRemove = (ex: Exercise) => {
    dismiss();
    const isUsed = used?.has(ex.id) ?? false;
    setConfirm(
      isUsed
        ? {
            title: '이 종목을 목록에서 뺄까요?',
            body: `${ex.name}은(는) 이미 기록에 썼어요. 검색에서만 사라지고 지난 기록은 그대로 남아요.`,
            okLabel: '목록에서 빼기',
            onOk: () => hide(ex),
          }
        : {
            title: '이 종목을 지울까요?',
            body: `${ex.name}이(가) 사라져요. 아직 기록에 쓰지 않아 되돌릴 수 없어요.`,
            onOk: () => remove(ex),
          },
    );
  };

  return (
    <>
      <div className="gp-screen__head">
        <button type="button" className="gp-screen__back" aria-label="뒤로" onClick={onBack}>
          ‹
        </button>
        <span className="gp-screen__title">내 종목</span>
      </div>

      <div className="gp-screen__body gp-scroll gp-mine">
        {mine.length ? (
          mine.map((ex) => (
            <div key={ex.id} className="gp-mine__row">
              <span className="gp-mine__text">
                <span className="gp-mine__name">{ex.name}</span>
                <span className="gp-mine__meta">
                  {[
                    MUSCLE_LABEL[ex.muscle_group],
                    EQUIP_LABEL[ex.equipment],
                    TRACK_LABEL[ex.tracking_type],
                  ].join(' · ')}
                </span>
              </span>
              <button
                type="button"
                className="gp-mine__act"
                aria-label={`${ex.name} 수정`}
                onClick={() => {
                  dismiss();
                  setEditing(ex);
                }}
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                className="gp-mine__act"
                aria-label={`${ex.name} 삭제`}
                onClick={() => askRemove(ex)}
              >
                <TrashIcon />
              </button>
            </div>
          ))
        ) : (
          <span className="gp-field__hint">
            아직 직접 추가한 종목이 없어요. 검색에서 못 찾은 종목을 추가하면 여기 모여요.
          </span>
        )}
      </div>

      {editing ? (
        <CustomExerciseSheet
          initialName={editing.name}
          initial={{
            group: editing.muscle_group,
            equip: editing.equipment,
            type: editing.tracking_type,
          }}
          title="종목 수정"
          saveLabel="저장"
          onSave={(draft) =>
            save(editing, {
              name: draft.name,
              chosung: draft.chosung,
              muscle_group: draft.muscle_group,
              equipment: draft.equipment,
              tracking_type: draft.tracking_type,
            })
          }
          onClose={() => setEditing(null)}
        />
      ) : null}

      {confirm ? <ConfirmDialog confirm={confirm} onCancel={() => setConfirm(null)} /> : null}

      {snack ? <Snackbar snack={snack} onDismiss={dismiss} /> : null}

      {error ? (
        <div className="gp-snack" role="status">
          <span className="gp-snack__msg">{error}</span>
          <button type="button" className="gp-snack__undo" onClick={() => setError(null)}>
            닫기
          </button>
        </div>
      ) : null}
    </>
  );
}
