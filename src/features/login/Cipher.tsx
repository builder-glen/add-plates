import { memo, useEffect, useRef } from 'react';

const LINES = ['LIGHT', 'WEIGHT,', 'BABY!!'];
const POOL = '#%&@$?!*+=/{}[]<>~^';
const TERM = 'sudo add-plate --both-sides';
const TPOOL = 'abcdef0123456789$#%&*+=/|_~';

/** mulberry32 — 시드 고정. 매 재생이 같은 순서로 흐른다 */
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 헤드라인 decrypt/scramble.
 * rAF 단일 루프에서 textContent 만 갱신한다 (리렌더 없음).
 */
function CipherBase() {
  const rootRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const term = termRef.current;
    if (!root) return;
    if (window.matchMedia?.('(prefers-reduced-motion:reduce)').matches) return;

    const cells = Array.from(root.querySelectorAll<HTMLSpanElement>('[data-ch]'));
    const rng = makeRng(7);
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = () => {
      const lock = cells.map((_, i) => 820 + i * 72 + (rng() * 2 - 1) * 110);
      const next = cells.map(() => 0);
      const done = cells.map(() => false);
      cells.forEach((el) => {
        el.dataset.state = 'scramble';
        el.textContent = POOL[(rng() * POOL.length) | 0];
      });

      const chars = TERM.split('');
      const tLock = chars.map((_, i) => 1360 + i * 42 + (rng() * 2 - 1) * 70);
      const tNext = chars.map(() => 0);
      const tOut: (string | null)[] = chars.map(() => null);
      const t0 = performance.now();

      const frame = () => {
        const now = performance.now() - t0;
        let left = 0;

        cells.forEach((el, i) => {
          if (done[i]) return;
          if (now >= lock[i]) {
            el.textContent = el.dataset.ch ?? '';
            el.dataset.state = 'lock';
            done[i] = true;
          } else {
            left++;
            if (now >= next[i]) {
              el.textContent = POOL[(rng() * POOL.length) | 0];
              next[i] = now + 46 + rng() * 35;
            }
          }
        });

        if (term) {
          let s = '';
          chars.forEach((ch, i) => {
            const out = tOut[i];
            if (out !== null) {
              s += out;
              return;
            }
            if (now >= tLock[i]) {
              tOut[i] = ch;
              s += ch;
              return;
            }
            left++;
            if (now >= tNext[i]) tNext[i] = now + 50 + rng() * 40;
            s += ch === ' ' ? ' ' : TPOOL[(rng() * TPOOL.length) | 0];
          });
          term.textContent = s;
        }

        if (left <= 0) {
          timer = setTimeout(run, 6800); // 완료 6.8초 뒤 재실행
          return;
        }
        raf = requestAnimationFrame(frame);
      };

      raf = requestAnimationFrame(frame);
    };

    run();

    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, []);

  let i = 0;
  return (
    <>
      <div className="gp-login__cipher" ref={rootRef} aria-label="LIGHT WEIGHT, BABY!!">
        {LINES.map((line) => (
          <div key={line}>
            {line.split('').map((ch) => (
              <span key={i} data-ch={ch} data-i={i++}>
                {ch}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="gp-login__term">
        <span className="gp-login__prompt">$</span>
        <span className="gp-login__cmd" ref={termRef}>
          {TERM}
        </span>
        <span className="gp-login__caret" />
      </div>
    </>
  );
}

export const Cipher = memo(CipherBase);
