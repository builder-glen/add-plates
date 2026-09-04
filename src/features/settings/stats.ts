// 내 정보 화면의 파생값. 화면에 하드코딩된 통계를 두지 않기 위해 전부 여기서 계산한다.
import { fmtWeight } from '../../data/queries';
import { fmtShortIso } from '../../lib/date';
import type { BodyMeasurement } from '../../lib/types';

/** 증감 색: good = --accent, flat = --ink2, none = --ink3 */
export type Tone = 'good' | 'flat' | 'none';

export interface Delta {
  text: string;
  tone: Tone;
}

/** 74.2 -> '74.2', 없으면 '—' */
export function fmt1(v: number | null): string {
  return v == null ? '—' : v.toFixed(1);
}

/**
 * 직전 측정 대비 증감.
 * betterDown = true 면 줄어드는 쪽이 좋은 값(체중·체지방률), false 면 느는 쪽(골격근량).
 */
export function delta(a: number | null, b: number | null, betterDown: boolean): Delta {
  if (a == null || b == null) return { text: '첫 측정', tone: 'none' };
  const d = Number((a - b).toFixed(1));
  if (d === 0) return { text: '변화 없음', tone: 'flat' };
  const good = betterDown ? d < 0 : d > 0;
  return { text: `${Math.abs(d).toFixed(1)}${d < 0 ? ' ↓' : ' ↑'}`, tone: good ? 'good' : 'flat' };
}

/** 체중 추이 폴리라인. viewBox 0 0 300 72 안에서 x 4~292, y 12~60 */
export interface Chart {
  pts: string;
  cx: number;
  cy: number;
  /** '75.6 → 74.2' 또는 '기록이 더 필요해요' */
  range: string;
}

/** rows 는 최신순. 체중이 있는 최근 7개를 오래된 → 최신 순으로 그린다 */
export function weightChart(rows: BodyMeasurement[]): Chart {
  const series = rows
    .map((r) => r.weight_kg)
    .filter((v): v is number => v != null)
    .slice(0, 7)
    .reverse();

  if (series.length < 2) {
    return { pts: '4,36 292,36', cx: 292, cy: 36, range: '기록이 더 필요해요' };
  }

  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const span = hi - lo || 1; // 값이 전부 같으면 0 으로 나눠진다
  const arr = series.map((v, i) => {
    const x = 4 + (288 * i) / (series.length - 1);
    const y = 60 - ((v - lo) / span) * 48;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });

  const last = arr[arr.length - 1];
  return {
    pts: arr.map((p) => `${p[0]},${p[1]}`).join(' '),
    cx: last[0],
    cy: last[1],
    range: `${series[0].toFixed(1)} → ${series[series.length - 1].toFixed(1)}`,
  };
}

/** '178cm · 74.2kg · 9/1 측정' — 없는 값은 그 자리 문구로 바꾼다 */
export function profileSummary(heightCm: number | null, rows: BodyMeasurement[]): string {
  const cur = rows[0];
  return [
    heightCm != null ? `${fmtWeight(heightCm)}cm` : '키 미입력',
    cur?.weight_kg != null ? `${cur.weight_kg.toFixed(1)}kg` : '측정 없음',
    cur ? `${fmtShortIso(cur.measured_at)} 측정` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** 체중 / (키m)² */
export function bmi(weightKg: number, heightCm: number): number {
  return weightKg / Math.pow(heightCm / 100, 2);
}
