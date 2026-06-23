#!/usr/bin/env python3
"""Generate PWA icons: rose background + white heart, pure stdlib."""
import zlib, struct

BG = (232, 97, 122)   # #E8617A — rose
FG = (255, 255, 255)  # white heart

def in_heart(px, py, cx, cy, r):
    x = (px - cx) / r
    y = -(py - cy) / r   # flip y so positive = up in math space
    return (x*x + y*y - 1)**3 - x*x * (y**3) <= 0

def coverage(px, py, cx, cy, r, n=4):
    return sum(
        in_heart(px + (dx+.5)/n, py + (dy+.5)/n, cx, cy, r)
        for dy in range(n) for dx in range(n)
    ) / (n*n)

def blend(a):
    return tuple(round(BG[i]*(1-a) + FG[i]*a) for i in range(3))

def generate(size):
    # r chosen so heart fits with ~15% padding on each side
    r  = int(size * 0.313)
    cx = size / 2
    # shift cy down by 0.1r so the heart is visually centred
    # (heart spans -1r below cy to ~1.2r above cy in math space)
    cy = size / 2 + r * 0.1
    return [blend(coverage(x+.5, y+.5, cx, cy, r)) for y in range(size) for x in range(size)]

def save_png(path, size, pixels):
    def chunk(t, d):
        body = t + d
        return struct.pack('>I', len(d)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    rows = b''.join(
        b'\x00' + b''.join(bytes(p) for p in pixels[y*size:(y+1)*size])
        for y in range(size)
    )
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', zlib.compress(rows, 9)))
        f.write(chunk(b'IEND', b''))

for size in [192, 512]:
    path = f'icons/icon-{size}.png'
    print(f'Generating {path} ...', end=' ', flush=True)
    save_png(path, size, generate(size))
    print('done')
