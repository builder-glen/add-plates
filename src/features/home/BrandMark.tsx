import { memo, useEffect, useRef, useState } from 'react';

/** 재실행할 때마다 번갈아 나오는 두 문구 */
const BRAND: [string, string][] = [
  ['+ADD', 'PLATES!!'],
  ['LIGHT-WEIGHT', 'BABY!!'],
];
const POOL = '#%&@$?!*+=/{}[]<>~^';

const flatten = (i: number) => BRAND[i].join('').split('');

/** mulberry32 — 시드 고정. 매 재생이 같은 순서로 흐른다 (로그인 화면과 같은 함수) */
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Frame {
  phrase: number;
  txt: string[];
  on: boolean[];
}

/** 문구가 바뀌면 글자 수도 바뀐다 — 세 값을 한 덩어리로 갈아야 길이가 어긋나지 않는다 */
const settled = (phrase: number): Frame => {
  const flat = flatten(phrase);
  return { phrase, txt: flat, on: flat.map(() => true) };
};

/**
 * 홈 헤더 좌측의 브랜드 마크.
 *
 * 로그인 화면 헤드라인과 같은 decrypt/scramble 이다 — 락인 시각·교체 주기·재실행
 * 간격을 그대로 쓴다. 다른 것은 팔레트뿐이다: 로그인은 검은 배경이라 회색에서
 * 흰색으로 굳지만, 여기는 밝은 배경이라 흐르는 동안 accent 를 띠고 ink 로 굳는다.
 *
 * DOM 을 직접 만지지 않고 상태로 돌린다. 글자 수가 스물이 안 돼 리렌더 비용이
 * 무의미하고, 정지 상태(글자가 전부 확정된 상태)가 곧 정답이라 애니메이션이
 * 끊겨도 안전하다. 재실행마다 두 문구를 번갈아 흘린다.
 */
function BrandMarkBase() {
  const [frame, setFrame] = useState<Frame>(() => settled(0));
  const raf = useRef(0);
  const timer = useRef(0);

  useEffect(() => {
    // 감속 설정이면 흐르게 하지 않는다. 최종 상태가 이미 초기값이다
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rng = makeRng(7);
    let alive = true;

    const run = (phrase: number) => {
      const flat = flatten(phrase);
      const t0 = performance.now();
      const lock = flat.map((_, i) => 820 + i * 72 + (rng() * 2 - 1) * 110);
      const next = flat.map(() => 0);
      const cur = flat.map(() => ' ');
      const done = flat.map(() => false);

      const tick = () => {
        if (!alive) return;
        const now = performance.now() - t0;
        let all = true;
        for (let i = 0; i < flat.length; i += 1) {
          if (done[i]) continue;
          if (now >= lock[i]) {
            cur[i] = flat[i];
            done[i] = true;
          } else {
            all = false;
            if (now >= next[i]) {
              cur[i] = POOL[Math.floor(rng() * POOL.length)];
              next[i] = now + 46 + rng() * 35;
            }
          }
        }
        setFrame({ phrase, txt: cur.slice(), on: done.slice() });
        if (all) {
          // 완료 6.8초 뒤 다음 문구로 재실행. 문구를 먼저 확정 상태로 갈아 끼우고
          // 한 박자 뒤 흐르게 해야, 여기서 끊겨도 온전한 문구가 남는다
          timer.current = window.setTimeout(() => {
            const nextPhrase = (phrase + 1) % BRAND.length;
            setFrame(settled(nextPhrase));
            timer.current = window.setTimeout(() => run(nextPhrase), 40);
          }, 6800);
          return;
        }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    };

    run(0);
    return () => {
      alive = false;
      cancelAnimationFrame(raf.current);
      clearTimeout(timer.current);
    };
  }, []);

  const lines = BRAND[frame.phrase];
  const cut = lines[0].length;
  const line = (from: number, to: number) => (
    <div>
      {frame.txt.slice(from, to).map((ch, i) => (
        <span
          key={from + i}
          className={frame.on[from + i] ? 'gp-brand__c gp-brand__c--on' : 'gp-brand__c'}
        >
          {ch}
        </span>
      ))}
    </div>
  );

  return (
    <div className="gp-brand" aria-label={lines.join(' ')}>
      <span aria-hidden="true">
        {line(0, cut)}
        {line(cut, frame.txt.length)}
      </span>
    </div>
  );
}

export const BrandMark = memo(BrandMarkBase);
