// build_assets.py 전용 svgo 설정.
// viewBox 를 지워버리면 CSS 로 44px 썸네일 크기를 줄 때 그림이 잘린다 → removeViewBox 를 끈다.
export default {
  multipass: true,
  floatPrecision: 1,
  plugins: [
    {
      name: 'preset-default',
      params: { overrides: { removeViewBox: false } },
    },
  ],
};
