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
          종목만 고르면 지난주에 몇 kg 들었는지 같이 떠요.
          <br />
          장갑 낀 손으로 세 탭이면 한 세트 끝.
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
