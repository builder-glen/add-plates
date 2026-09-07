import { useAuth } from '../../auth/AuthProvider';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Cipher } from './Cipher';
import '../../styles/login.css';

export function LoginScreen() {
  const { signIn, signingIn, error } = useAuth();

  return (
    <div className="gp-login">
      <Cipher />

      <div className="gp-login__foot">
        <div className="gp-login__desc">
          내가 성장하는지 확인하는 손쉬운 방법
          <br />
          &lsquo;아 지난주에 몇분할 했더라&rsquo;, &lsquo;오늘 어디 할 차례지&rsquo; 찾지 말아요.
          <br />
          가볍게 체크하는 운동 기록 서비스 <b className="gp-login__mark">ADD PLATES</b> 에서 시작해요
        </div>

        <button
          type="button"
          className="gp-login__btn"
          onClick={signIn}
          disabled={!isSupabaseConfigured || signingIn}
        >
          {signingIn ? '구글로 이동 중…' : 'Google로 계속하기'}
        </button>

        {!isSupabaseConfigured ? (
          <div className="gp-login__note gp-login__note--warn">
            Supabase 키가 없어요. .env 에 VITE_SUPABASE_URL 과 VITE_SUPABASE_ANON_KEY 를 넣고 다시
            띄워주세요.
          </div>
        ) : error ? (
          <div className="gp-login__note gp-login__note--warn">{error}</div>
        ) : (
          <div className="gp-login__note">봉은 조상이 들이주지 않는다.</div>
        )}
      </div>
    </div>
  );
}
