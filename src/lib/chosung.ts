const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

/**
 * '벤치프레스' -> 'ㅂㅊㅍㄹㅅ'
 *
 * 기본 종목 204개의 초성은 DB에 이미 들어 있다. 이 함수는 **사용자가 직접 추가한 종목**
 * 에만 쓴다. seeds/build_seed.py 의 chosung() 과 규칙이 같아야 검색이 섞이지 않는다:
 * 완성형 한글은 초성으로, 영문·숫자는 소문자로, 공백은 버린다.
 */
export function toChosung(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) out += CHO[Math.floor((code - 0xac00) / 588)];
    else if (ch.trim()) out += ch.toLowerCase();
  }
  return out;
}
