import { useState } from 'react';
import { useExercises } from '../../data/exercises';
import type { NewExercise } from '../../data/queries';
import { toChosung } from '../../lib/chosung';
import { EQUIP_LABEL, MUSCLE_LABEL } from '../../lib/labels';
import type { Equipment, MuscleGroup, TrackingType } from '../../lib/types';
import '../../styles/picker.css';

const GROUPS = Object.keys(MUSCLE_LABEL) as MuscleGroup[];
const EQUIPS = Object.keys(EQUIP_LABEL) as Equipment[];
const TYPES: { key: TrackingType; label: string }[] = [
  { key: 'weight_reps', label: '무게 + 횟수' },
  { key: 'bodyweight_reps', label: '횟수만' },
];

interface Props {
  /** 검색어로 미리 채운다 */
  initialName: string;
  /** 저장 + 오늘 기록에 넣기. 실패하면 throw */
  onSave: (draft: Omit<NewExercise, 'owner_id'>) => Promise<void>;
  onClose: () => void;
}

export function CustomExerciseSheet({ initialName, onSave, onClose }: Props) {
  const { all } = useExercises();
  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState<MuscleGroup>('core');
  const [equip, setEquip] = useState<Equipment>('other');
  const [type, setType] = useState<TrackingType>('weight_reps');
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
      <div className="gp-sheet" role="dialog" aria-label="종목 직접 추가">
        <div className="gp-grab" />
        <span className="gp-custom__title">종목 직접 추가</span>

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
          {saving ? '저장하는 중…' : '저장하고 오늘 기록에 넣기'}
        </button>
      </div>
    </>
  );
}
