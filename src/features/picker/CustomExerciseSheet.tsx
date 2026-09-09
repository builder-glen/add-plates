import { useState } from 'react';
import { useExercises } from '../../data/exercises';
import type { NewExercise } from '../../data/queries';
import { toChosung } from '../../lib/chosung';
import { useSheetDrag } from '../../lib/useSheetDrag';
import { EQUIP_LABEL, MUSCLE_LABEL } from '../../lib/labels';
import type { Equipment, MuscleGroup, TrackingType } from '../../lib/types';
import '../../styles/picker.css';

const GROUPS = Object.keys(MUSCLE_LABEL) as MuscleGroup[];
const EQUIPS = Object.keys(EQUIP_LABEL) as Equipment[];
const TYPES: { key: TrackingType; label: string }[] = [
  { key: 'weight_reps', label: '무게 + 횟수' },
  { key: 'bodyweight_reps', label: '횟수만' },
  // 어시스트 머신용. 값이 줄어드는 게 성장이라 총 볼륨에는 들어가지 않는다
  { key: 'assist_reps', label: '보조중량 + 횟수' },
];

/** 수정으로 열 때 미리 채워 넣을 값 */
export interface ExerciseDraft {
  name: string;
  group: MuscleGroup;
  equip: Equipment;
  type: TrackingType;
}

interface Props {
  /** 검색어(추가) 또는 지금 값(수정)으로 미리 채운다 */
  initialName: string;
  /** 수정으로 열 때. 없으면 새 종목 추가다 */
  initial?: Omit<ExerciseDraft, 'name'>;
  /** 기본값은 추가 폼 문구 */
  title?: string;
  saveLabel?: string;
  /** 저장. 실패하면 throw */
  onSave: (draft: Omit<NewExercise, 'owner_id'>) => Promise<void>;
  onClose: () => void;
}

export function CustomExerciseSheet({
  initialName,
  initial,
  title = '종목 직접 추가',
  saveLabel = '저장하고 오늘 기록에 넣기',
  onSave,
  onClose,
}: Props) {
  const { all } = useExercises();
  const sheet = useSheetDrag(onClose);
  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState<MuscleGroup>(initial?.group ?? 'core');
  const [equip, setEquip] = useState<Equipment>(initial?.equip ?? 'other');
  const [type, setType] = useState<TrackingType>(initial?.type ?? 'weight_reps');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const chosung = toChosung(trimmed);
  // 기본 종목과 이름이 겹쳐도 막지 않는다. 알려주기만 한다 (PRD F-07)
  const clash = !!trimmed && all.some((e) => !e.owner_id && e.name === trimmed);

  const save = async () => {
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: trimmed,
        chosung,
        muscle_group: group,
        sub_region: 'general',
        equipment: equip,
        tracking_type: type,
      });
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      setError(
        code === '23505'
          ? '같은 이름의 내 종목이 이미 있어요.'
          : '저장하지 못했어요. 다시 눌러 주세요.',
      );
      setSaving(false);
    }
  };

  return (
    <>
      <div className="gp-overlay" onClick={onClose} />
      <div className="gp-sheet" ref={sheet.sheetRef} role="dialog" aria-label={title}>
        <div className="gp-grab" {...sheet.handle} />
        <span className="gp-custom__title">{title}</span>

        <div className="gp-field">
          <span className="gp-field__label">이름</span>
          <input
            className="gp-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="종목 이름"
          />
          <span className="gp-field__hint">초성 {chosung} · 알아서 계산했어요</span>
          {clash ? (
            <span className="gp-field__hint">같은 이름의 기본 종목이 있어요. 그래도 추가돼요.</span>
          ) : null}
        </div>

        <div className="gp-field">
          <span className="gp-field__label">부위</span>
          <div className="gp-opts">
            {GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                className={`gp-opt${group === g ? ' gp-opt--on' : ''}`}
                onClick={() => setGroup(g)}
              >
                {MUSCLE_LABEL[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="gp-field">
          <span className="gp-field__label">기구</span>
          <div className="gp-opts">
            {EQUIPS.map((eq) => (
              <button
                key={eq}
                type="button"
                className={`gp-opt${equip === eq ? ' gp-opt--on' : ''}`}
                onClick={() => setEquip(eq)}
              >
                {EQUIP_LABEL[eq]}
              </button>
            ))}
          </div>
        </div>

        <div className="gp-field">
          <span className="gp-field__label">기록 방식</span>
          <div className="gp-opts--wide">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`gp-opt gp-opt--wide${type === t.key ? ' gp-opt--on' : ''}`}
                onClick={() => setType(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error ? <span className="gp-field__hint gp-field__hint--warn">{error}</span> : null}

        <button
          type="button"
          className="gp-custom__save"
          disabled={!trimmed || saving}
          onClick={() => void save()}
        >
          {saving ? '저장하는 중…' : saveLabel}
        </button>
      </div>
    </>
  );
}
