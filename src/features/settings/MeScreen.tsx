import { useState } from 'react';
import { ConfirmDialog, type Confirm } from '../../components/ConfirmDialog';
import { Snackbar, useSnack } from '../../components/Snackbar';
import type { BodyData } from '../../data/useBodyData';
import { fmtWeight } from '../../data/queries';
import { fmtShortIso } from '../../lib/date';
import type { BodyMeasurement } from '../../lib/types';
import { RulerIcon, XIcon } from '../home/icons';
import { HeightSheet } from './HeightSheet';
import { MeasureSheet } from './MeasureSheet';
import { bmi, delta, fmt1, weightChart, type Tone } from './stats';
import '../../styles/settings.css';

const toneClass = (t: Tone) => `gp-me__delta gp-me__delta--${t}`;

type Sheet = 'height' | 'meas' | null;

interface Props {
  body: BodyData;
  onBack: () => void;
}

export function MeScreen({ body, onBack }: Props) {
  const { snack, show, dismiss } = useSnack();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const rows = body.rows;
  const cur = rows[0] ?? null;
  const prev = rows[1] ?? null;

  const dW = delta(cur?.weight_kg ?? null, prev?.weight_kg ?? null, true);
  const dSM = delta(cur?.skeletal_muscle_kg ?? null, prev?.skeletal_muscle_kg ?? null, false);
  const dBF = delta(cur?.body_fat_pct ?? null, prev?.body_fat_pct ?? null, true);
  const chart = weightChart(rows);

  const askRemove = (m: BodyMeasurement) => {
    dismiss();
    setConfirm({
      title: '이 측정 기록을 지울까요?',
      body: `${fmtShortIso(m.measured_at)} · ${fmt1(m.weight_kg)}kg 기록이 사라져요. 5초 안에는 되돌릴 수 있어요.`,
      onOk: () => {
        body.removeMeasurement(m);
        show('측정 기록 삭제됨', () => body.restoreMeasurement(m));
      },
    });
  };

  const heightHint = () => {
    if (body.heightCm == null) return '한 번만 넣으면 BMI를 같이 계산해요';
    if (cur?.weight_kg == null) return '체중을 넣으면 BMI도 같이';
    return `BMI ${bmi(cur.weight_kg, body.heightCm).toFixed(1)}`;
  };

  const historyContent = () => {
    if (body.status === 'loading') return <div className="gp-note">불러오는 중…</div>;
    if (body.status === 'error') {
      return (
        <div className="gp-note gp-note--warn">
          내 정보를 불러오지 못했어요.{' '}
          <button type="button" className="gp-retry" onClick={() => void body.reload()}>
            다시 시도
          </button>
        </div>
      );
    }
    if (!rows.length) {
      return <span className="gp-field__hint">아직 측정 기록이 없어요.</span>;
    }
    return rows.map((m, i) => {
      const d = delta(m.weight_kg, rows[i + 1]?.weight_kg ?? null, true);
      return (
        <div key={m.id} className="gp-me__row">
          <span className="gp-me__date gp-num">{fmtShortIso(m.measured_at)}</span>
          <span className="gp-me__body gp-num">
            {[fmt1(m.weight_kg), fmt1(m.skeletal_muscle_kg), fmt1(m.body_fat_pct)].join(' · ')}
          </span>
          <span className={`${toneClass(d.tone)} gp-num`}>{d.text}</span>
          <button
            type="button"
            className="gp-me__del"
            aria-label="측정 기록 삭제"
            onClick={() => askRemove(m)}
          >
            <XIcon />
          </button>
        </div>
      );
    });
  };

  return (
    <>
      <div className="gp-screen__head">
        <button type="button" className="gp-screen__back" aria-label="뒤로" onClick={onBack}>
          ‹
        </button>
        <span className="gp-screen__title">내 정보</span>
      </div>

      <div className="gp-screen__body gp-scroll gp-me">
        <div className="gp-me__cur">
          <span className="gp-me__curW gp-num">{fmt1(cur?.weight_kg ?? null)}</span>
          <span className="gp-me__curUnit">kg</span>
          <span className={`${toneClass(dW.tone)} gp-me__curDelta gp-num`}>
            {dW.tone === 'none' ? '첫 측정' : `직전보다 ${dW.text}`}
          </span>
        </div>

        <div className="gp-me__chart">
          <div className="gp-me__chartHead">
            <span className="gp-micro">체중 6개월</span>
            <span className="gp-me__chartRange gp-num">{chart.range}</span>
          </div>
          <svg viewBox="0 0 300 72" width="100%" height="72" preserveAspectRatio="none">
            <polyline
              points={chart.pts}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={chart.cx} cy={chart.cy} r="4" fill="var(--accent)" />
          </svg>
        </div>

        <div className="gp-me__cards">
          <div className="gp-me__card">
            <span className="gp-me__cardLabel">골격근량</span>
            <span className="gp-me__cardValue gp-num">
              {cur?.skeletal_muscle_kg != null ? `${fmt1(cur.skeletal_muscle_kg)} kg` : '—'}
            </span>
            <span className={`${toneClass(dSM.tone)} gp-num`}>{dSM.text}</span>
          </div>
          <div className="gp-me__card">
            <span className="gp-me__cardLabel">체지방률</span>
            <span className="gp-me__cardValue gp-num">
              {cur?.body_fat_pct != null ? `${fmt1(cur.body_fat_pct)} %` : '—'}
            </span>
            <span className={`${toneClass(dBF.tone)} gp-num`}>{dBF.text}</span>
          </div>
        </div>

        <div className="gp-me__section">
          <div className="gp-micro gp-cfg__label">측정 이력</div>
          {historyContent()}
        </div>

        <button
          type="button"
          className={`gp-me__height${body.heightCm == null ? ' gp-me__height--empty' : ''}`}
          onClick={() => {
            dismiss();
            setSheet('height');
          }}
        >
          <RulerIcon />
          <span className="gp-me__heightText">
            <span className="gp-me__heightLabel">
              {body.heightCm != null ? `키 ${fmtWeight(body.heightCm)}cm` : '키를 넣어주세요'}
            </span>
            <span className="gp-me__heightHint gp-num">{heightHint()}</span>
          </span>
          <span className="gp-cfg__chev">›</span>
        </button>

        <span className="gp-field__hint">골격근량·체지방은 아는 것만 넣어도 저장돼요.</span>

        <button
          type="button"
          className="gp-me__add"
          onClick={() => {
            dismiss();
            setSheet('meas');
          }}
        >
          ＋ 측정 기록
        </button>
      </div>

      {sheet === 'height' ? (
        <HeightSheet
          initial={body.heightCm}
          onSave={(cm) => {
            body.saveHeight(cm);
            setSheet(null);
            show('키를 저장했어요');
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === 'meas' ? (
        <MeasureSheet
          onSave={(w, sm, bf) => {
            body.addMeasurement(w, sm, bf);
            setSheet(null);
            show('측정 기록을 저장했어요');
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {confirm ? <ConfirmDialog confirm={confirm} onCancel={() => setConfirm(null)} /> : null}

      {snack ? <Snackbar snack={snack} onDismiss={dismiss} /> : null}

      {body.error ? (
        <div className="gp-snack" role="status">
          <span className="gp-snack__msg">{body.error}</span>
          <button type="button" className="gp-snack__undo" onClick={body.clearError}>
            닫기
          </button>
        </div>
      ) : null}
    </>
  );
}
