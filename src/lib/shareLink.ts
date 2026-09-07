// 공유 링크의 인코딩·디코딩 (docs/share-spec.md).
//
// 기록을 서버에 저장하지 않고 링크 자체에 넣는다 — 저장하지 않는 것은 유출될 수 없고,
// 받는 쪽이 로그인하지 않아도 열린다. 값은 '#' 뒤에 두므로 호스팅 서버로 전송되지 않는다.
//
// 형식: JSON → deflate-raw → base64url. 키를 한 글자로 줄인 것은 압축 전 크기를 줄이려는 것이다.
// 총 볼륨은 담지 않는다 — 받는 쪽에서 계산한다. 값이 하나 더 들어가면 원본과 어긋날 여지가 생긴다.

import { EQUIP_LABEL, MUSCLE_LABEL } from './labels';
import type { DayEntry, TrackingType } from './types';

/** 첫 글자가 압축 여부를 말한다. 'z' = deflate-raw, 'u' = 압축 없음(CompressionStream 미지원) */
const TAG_DEFLATE = 'z';
const TAG_PLAIN = 'u';

/** 한 세트 — [무게(kg), 횟수]. 맨몸이면 무게가 null */
export type ShareSet = [number | null, number];

export interface ShareExercise {
  /** 종목명. 마스터를 그대로 넣는다 — 받는 쪽이 종목 마스터를 몰라도 되고,
      나중에 종목을 지우거나 이름을 바꿔도 링크가 깨지지 않는다 */
  n: string;
  /** 부위 라벨 ('가슴') */
  m: string;
  /** 기구 라벨 ('바벨') */
  q: string;
  /** asset_slug — 썸네일용. 없으면 생략한다 */
  a?: string;
  /** tracking_type — 맨몸이면 총합을 '회' 로 표시해야 한다 */
  t: TrackingType;
  s: ShareSet[];
}

export interface SharePayload {
  /** 'YYYY-MM-DD' */
  d: string;
  e: ShareExercise[];
}

// ── base64url ──────────────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  // 한 번에 넘기면 인수 개수 제한에 걸린다 — 32KB 씩 끊어 붙인다
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** 압축/해제 스트림에 바이트를 통과시킨다 */
async function pipe(bytes: Uint8Array, ts: GenericTransformStream): Promise<Uint8Array> {
  const src = new ReadableStream({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
  return new Uint8Array(await new Response(src.pipeThrough(ts)).arrayBuffer());
}

// ── 인코딩 ─────────────────────────────────────────────

/**
 * 그날 기록을 링크에 담을 모양으로 줄인다. 세트가 없는 종목은 보여줄 게 없으니 뺀다.
 *
 * JSON 문자열로 돌려주는 것은 압축에 넣을 값이 바로 이것이기도 하고,
 * 화면 쪽에서 "내용이 바뀌었는가"를 값으로 비교할 수 있어서다 —
 * 기록 배열은 렌더마다 새로 만들어져 참조로는 비교가 안 된다.
 */
export function buildShareJson(dateKey: string, entries: DayEntry[]): string {
  const payload: SharePayload = {
    d: dateKey,
    e: entries
      .filter((entry) => entry.sets.length > 0)
      .map((entry): ShareExercise => {
        const ex = entry.exercise;
        return {
          n: ex.name,
          m: MUSCLE_LABEL[ex.muscle_group],
          q: EQUIP_LABEL[ex.equipment],
          // 그림이 없는 종목(대부분 머신)은 키째로 뺀다.
          // 순서는 parsePayload 와 맞춘다 — 풀었다 다시 담아도 같은 링크가 나온다
          ...(ex.asset_slug ? { a: ex.asset_slug } : {}),
          t: ex.tracking_type,
          s: entry.sets.map((s): ShareSet => [s.weight_kg, s.reps]),
        };
      }),
  };
  return JSON.stringify(payload);
}

/** buildShareJson 이 만든 문자열을 링크 조각으로 굳힌다 */
export async function encodeShare(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'function') {
    try {
      return TAG_DEFLATE + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
    } catch {
      // 압축이 막힌 환경이면 그냥 담는다 — 길어질 뿐 동작은 같다
    }
  }
  return TAG_PLAIN + toBase64Url(bytes);
}

// ── 디코딩 ─────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * 링크에서 나온 값은 남이 만든 문자열이다 — 모양이 조금이라도 어긋나면 통째로 버린다.
 * 반쯤 그려진 화면보다 '링크가 올바르지 않아요' 가 낫다.
 */
function parsePayload(raw: unknown): SharePayload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { d, e } = raw as { d?: unknown; e?: unknown };
  if (typeof d !== 'string' || !DATE_RE.test(d)) return null;
  if (!Array.isArray(e)) return null;

  const out: ShareExercise[] = [];
  for (const item of e) {
    if (typeof item !== 'object' || item === null) return null;
    const { n, m, q, a, t, s } = item as Record<string, unknown>;
    if (typeof n !== 'string' || !n) return null;
    if (!Array.isArray(s)) return null;

    const sets: ShareSet[] = [];
    for (const set of s) {
      if (!Array.isArray(set) || set.length !== 2) return null;
      const [w, r] = set as unknown[];
      if (w !== null && !isNum(w)) return null;
      if (!isNum(r)) return null;
      sets.push([w as number | null, r]);
    }

    out.push({
      n,
      m: typeof m === 'string' ? m : '',
      q: typeof q === 'string' ? q : '',
      ...(typeof a === 'string' && a ? { a } : {}),
      // 옛 링크에 t 가 없더라도 기본값으로 열어 준다
      t: t === 'bodyweight_reps' ? 'bodyweight_reps' : 'weight_reps',
      s: sets,
    });
  }
  return { d, e: out };
}

export async function decodeShare(code: string): Promise<SharePayload | null> {
  try {
    const body = fromBase64Url(code.slice(1));
    let bytes: Uint8Array;
    if (code[0] === TAG_DEFLATE) {
      bytes = await pipe(body, new DecompressionStream('deflate-raw'));
    } else if (code[0] === TAG_PLAIN) {
      bytes = body;
    } else {
      return null;
    }
    return parsePayload(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

// ── 주소 ───────────────────────────────────────────────

/**
 * 공유 화면인지 판별한다. '/s' 하나뿐이고, 그 밖의 주소는 null 이다.
 * 코드가 비어 있으면 빈 문자열을 돌려준다 — 화면은 '링크가 올바르지 않아요' 를 띄운다.
 */
export function shareCodeFromLocation(): string | null {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path !== '/s') return null;
  return window.location.hash.replace(/^#/, '');
}

export function shareUrl(code: string): string {
  return `${window.location.origin}/s#${code}`;
}
