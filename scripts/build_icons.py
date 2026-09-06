#!/usr/bin/env python3
"""
앱 아이콘(PNG)을 SVG 정의에서 생성한다.

외부 변환 도구 없이 순수 파이썬으로 그린다 — 도형이 원판(도넛)과 배경뿐이라
직접 래스터화하는 편이 의존성을 늘리는 것보다 낫다. 4x 슈퍼샘플링으로 계단을 없앤다.

maskable 아이콘은 별도로 만든다. 런처가 원형으로 깎아내므로
W3C 안전 영역(중앙 반지름 40% = 512px 기준 204.8px) 안에 그림이 들어가야 한다.
기존 아이콘은 바깥 반지름이 205px 라 정확히 경계에 걸려 테두리가 잘렸다.
"""
import struct, zlib, pathlib

BG = (0x0A, 0x0A, 0x0A)
FG = (0x32, 0xD5, 0x83)
SS = 4  # 슈퍼샘플링 배수

def render(size: int, r_out: float, r_in: float) -> bytes:
    """정사각 캔버스에 배경 + 링을 그려 RGB 바이트로 돌려준다. 반지름은 512 기준 비율."""
    n = size * SS
    c = n / 2
    ro, ri = r_out / 512 * n, r_in / 512 * n
    ro2, ri2 = ro * ro, ri * ri

    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            hit = 0
            for sy in range(SS):
                fy = (y * SS + sy) + 0.5 - c
                for sx in range(SS):
                    fx = (x * SS + sx) + 0.5 - c
                    d2 = fx * fx + fy * fy
                    if ri2 <= d2 <= ro2:
                        hit += 1
            a = hit / (SS * SS)
            row += bytes(round(BG[i] + (FG[i] - BG[i]) * a) for i in range(3))
        rows.append(bytes(row))
    return rows

def write_png(path: pathlib.Path, rows: list[bytes], size: int) -> None:
    raw = b''.join(b'\x00' + r for r in rows)          # 필터 타입 0
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    path.write_bytes(png)

PUB = pathlib.Path('public')

# any 용도 — 화면에 그대로 보이므로 꽉 차게
ANY = dict(r_out=205, r_in=87)
# maskable — 안전 영역 204.8px 안쪽에 여유를 두고 넣는다
MASK = dict(r_out=165, r_in=70)

for name, size, geo in [
    ('icon-512.png', 512, ANY),
    ('icon-192.png', 192, ANY),
    ('apple-touch-icon.png', 180, ANY),
    ('icon-maskable-512.png', 512, MASK),
    ('icon-maskable-192.png', 192, MASK),
]:
    write_png(PUB / name, render(size, **geo), size)
    print(f'  {name:26} {size}x{size}  r_out={geo["r_out"]}')

# maskable SVG 도 같이 남긴다
(PUB / 'icon-maskable.svg').write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n'
    '  <rect width="512" height="512" fill="#0a0a0a"/>\n'
    '  <circle cx="256" cy="256" r="117.5" fill="none" stroke="#32d583" stroke-width="95"/>\n'
    '</svg>\n', encoding='utf-8')
print('  icon-maskable.svg')
