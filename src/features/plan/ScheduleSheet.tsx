import { fmtDateField } from '../../lib/date';
import { CalendarIcon, ClockIcon } from '../home/icons';
import '../../styles/plan.css';

/** 일정 폼의 입력값. 캘린더 시트를 다녀와도 남아 있어야 해서 홈이 들고 있는다 */
export interface PlanDraft {
  /** 고치는 중인 일정의 id. 새 일정이면 null */
  id: string | null;
  /** 폼을 열었을 때의 날짜. 날짜를 옮겼는지 판단한다 */
  fromDate: string | null;
  title: string;
  memo: string;
  allDay: boolean;
  hour: number;
  min: number;
}

/** 디자인 기본값 — 저녁 7시 30분 */
export const NEW_DRAFT: PlanDraft = {
  id: null,
  fromDate: null,
  title: '',
  memo: '',
  allDay: false,
  hour: 19,
  min: 30,
};

interface Props {
  dateKey: string;
  draft: PlanDraft;
  onChange: (next: PlanDraft) => void;
  onPickDate: () => void;
  onPickTime: () => void;
  /** true 면 저장한 뒤 구글 캘린더를 연다 */
  onSave: (openGoogle: boolean) => void;
  onClose: () => void;
}

export function ScheduleSheet({
  dateKey,
  draft,
  onChange,
  onPickDate,
  onPickTime,
  onSave,
  onClose,
}: Props) {
  const timeLabel = draft.allDay
    ? '종일'
    : `${String(draft.hour).padStart(2, '0')}:${String(draft.min).padStart(2, '0')}`;
  const canSave = draft.title.trim().length > 0;

  return (
    <>
      <div className="gp-overlay" onClick={onClose} />
      <div className="gp-sheet gp-sheet--schedule" role="dialog" aria-label="일정 등록">
        <div className="gp-grab" />
        <span className="gp-custom__title">{draft.id ? '일정 수정' : '일정 등록'}</span>

        <div className="gp-plan__row2">
          <div className="gp-field">
            <span className="gp-field__label">날짜</span>
            <button type="button" className="gp-field__btn gp-num" onClick={onPickDate}>
              <CalendarIcon size={15} dots={false} />
              <span>{fmtDateField(dateKey)}</span>
            </button>
          </div>
          <div className="gp-field">
            <span className="gp-field__label">시간</span>
            <button type="button" className="gp-field__btn gp-num" onClick={onPickTime}>
              <ClockIcon />
              <span>{timeLabel}</span>
            </button>
          </div>
        </div>

        <div className="gp-field">
          <span className="gp-field__label">이름</span>
          <input
            className="gp-input"
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            placeholder="등 운동"
            aria-label="일정 이름"
          />
        </div>

        <div className="gp-field">
          <span className="gp-field__label">메모 (선택)</span>
          <input
            className="gp-input gp-input--memo"
            value={draft.memo}
            onChange={(e) => onChange({ ...draft, memo: e.target.value })}
            aria-label="일정 메모"
          />
        </div>

        <div className="gp-plan__actions">
          <button
            type="button"
            className="gp-plan__save"
            disabled={!canSave}
            onClick={() => onSave(false)}
          >
            저장
          </button>
          <button
            type="button"
            className="gp-plan__save2"
            disabled={!canSave}
            onClick={() => onSave(true)}
          >
            저장하고 구글 캘린더 열기
          </button>
          <span className="gp-plan__caution">
            캘린더로 보낸 일정은 앱에서 지워도 캘린더엔 남아요
          </span>
        </div>
      </div>
    </>
  );
}
