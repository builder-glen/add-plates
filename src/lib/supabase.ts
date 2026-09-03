import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** 키가 없으면 앱을 죽이지 않고 로그인 화면에서 안내만 띄운다 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true, // 껐다 켜도 로그인 유지
        autoRefreshToken: true,
        detectSessionInUrl: true, // OAuth 리다이렉트 복귀 처리
      },
    })
  : null;

/** 호출부에서 매번 null 체크하지 않도록 */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase 환경변수가 없습니다.');
  return supabase;
}
