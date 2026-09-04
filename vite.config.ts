import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { target: 'es2020' },
  // 포트를 고정한다. 다른 프로젝트가 5173을 쓰고 있어 Vite 기본값이면
  // 실행할 때마다 포트가 밀리는데, 구글 OAuth 승인 원본은 포트까지 일치해야 해서
  // 포트가 바뀌면 로컬 로그인이 깨진다.
  server: { port: 5273, strictPort: true },
});
