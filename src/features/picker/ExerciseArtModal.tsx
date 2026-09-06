import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EQUIP_LABEL, MUSCLE_LABEL, SUB_LABEL } from '../../lib/labels';
import type { Exercise } from '../../lib/types';

/**
 * 목록 썸네일(44px)이 작아서 안 보인다는 요청 — 그림만 눌러 크게 본다.
 *
 * 목록은 frame-1(정지 컷) 하나만 받는다. 이 모달을 연 뒤에야 frame-2·3 을 받아
 * 1→2→3→2→1 로 왕복 재생한다 → 목록 스크롤 성능은 그대로 두고 동작만 보여준다.
 * 두 장을 다 받기 전(또는 모션 줄이기 설정)에는 frame-1 정지 화면 그대로다.
 */
interface Props {
  /** asset_slug 가 있는 종목만 들어온다 — 폴백 타일은 이 모달을 열지 않는다 */
  exercise: Exercise;
  onClose: () => void;
}

const artUrl = (slug: string, frame?: 2 | 3) =>
  `url("/exercises/${slug}${frame ? `-${frame}` : ''}.svg")`;

export function ExerciseArtModal({ exercise, onClose }: Props) {
  const slug = exercise.asset_slug ?? '';
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    // 모션을 줄이는 설정이면 동작 프레임을 받지도 않는다
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let alive = true;
    const load = (frame: 2 | 3) =>
      new Promise<void>((ok, fail) => {
        const img = new Image();
        img.onload = () => ok();
        img.onerror = () => fail(new Error(frame.toString()));
        img.src = `/exercises/${slug}-${frame}.svg`;
      });
    // 한 장이라도 없으면 재생하지 않는다 — 중간에 빈 컷이 끼는 게 더 고장처럼 보인다
    Promise.all([load(2), load(3)])
      .then(() => {
        if (alive) setPlay(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  const sub = exercise.sub_region ? SUB_LABEL[exercise.sub_region] : null;
  const meta = [MUSCLE_LABEL[exercise.muscle_group], sub, EQUIP_LABEL[exercise.equipment]]
    .filter(Boolean)
    .join(' · ');

  // 앱 루트에 붙인다. 카드 안에서 열면 카드가 position:relative + overflow:hidden
  // 이라 absolute 배치가 카드 기준이 되어 화면이 아니라 카드에 갇힌다.
  const root = document.querySelector('.gp-app') ?? document.body;

  return createPortal(
    <>
      <div className="gp-overlay gp-overlay--art" onClick={onClose} />
      <div
        className="gp-artview"
        role="dialog"
        aria-modal="true"
        aria-label={`${exercise.name} 동작 그림`}
      >
        {/* 그림은 장식이다 — 이름·부위는 아래 텍스트가 읽어준다 */}
        <div className={`gp-art${play ? ' gp-art--play' : ''}`} aria-hidden="true">
          <span
            className="gp-art__layer gp-art__layer--1"
            style={{ ['--art' as string]: artUrl(slug) }}
          />
          {play ? (
            <>
              <span
                className="gp-art__layer gp-art__layer--2"
                style={{ ['--art' as string]: artUrl(slug, 2) }}
              />
              <span
                className="gp-art__layer gp-art__layer--3"
                style={{ ['--art' as string]: artUrl(slug, 3) }}
              />
            </>
          ) : null}
        </div>

        <div className="gp-artview__text">
          <span className="gp-artview__name">{exercise.name}</span>
          <span className="gp-artview__meta">{meta}</span>
        </div>

        <button type="button" className="gp-artview__close" aria-label="그림 닫기" onClick={onClose}>
          ✕
        </button>
      </div>
    </>,
    root,
  );
}
