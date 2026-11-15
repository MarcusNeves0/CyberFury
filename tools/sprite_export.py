"""Exporta um lutador do characters.js para o LibreSprite.

Uso:  python tools/sprite_export.py vex
Gera em assets/SPRITES/:
  <lutador>.ase          quadros "parado" e "golpe" (com tags), na paleta do lutador, 64x64
  <lutador>_parado.png   e <lutador>_golpe.png (para ver rápido, sem abrir o LibreSprite)

O .ase é escrito direto no formato do Aseprite/LibreSprite (1 camada, cores RGBA, paleta e tags).
"""
import os, re, struct, sys, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'assets', 'SPRITES')


# --- Leitura do characters.js ---
def read_fighter(name):
    src = open(os.path.join(ROOT, 'characters.js'), encoding='utf-8').read()
    start = src.index(f'pixelCharacters.{name} = {{')
    block = src[start:src.index('\n};', start)]
    size_m = re.search(r'^\s+size:\s*(\d+)', block, re.M)
    size = int(size_m.group(1)) if size_m else 32
    if size != 64:
        sys.exit(f'{name}: só lutadores desenhados em 64x64 por enquanto (este é {size}x{size})')
    pal_block = block[block.index('palette:'):]
    pal_block = pal_block[:pal_block.index('}')]
    palette = dict(re.findall(r"(\w):\s*'(#[0-9a-fA-F]{6})'", pal_block))
    palette['K'] = '#1a1024'  # OUTLINE
    idle_block = block[block.index('    idle: ['):]
    idle_block = idle_block[:idle_block.index('    ],')]
    idle = re.findall(r"^\s+'([^']*)',", idle_block, re.M)
    attack = {}
    if '    attack: {' in block:
        att_block = block[block.index('    attack: {'):]
        att_block = att_block[:att_block.index('    },')]
        attack = {int(a): b for a, b in re.findall(r"^\s+(\d+):\s*'([^']*)'", att_block, re.M)}
    grid = lambda rows: [(rows[y] if y < len(rows) else '').ljust(size, '.')[:size] for y in range(size)]
    idle_g = grid(idle)
    attack_g = grid([attack.get(i, r) for i, r in enumerate(idle_g)])
    return size, palette, {'parado': idle_g, 'golpe': attack_g}


def rgba(grid, palette, size):
    out = bytearray()
    for row in grid:
        for ch in row:
            c = palette.get(ch)
            if c:
                out += bytes((int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), 255))
            else:
                out += b'\0\0\0\0'
    return bytes(out)


# --- Escrita do .ase ---
def chunk(kind, data):
    return struct.pack('<IH', len(data) + 6, kind) + data

def ase_string(s):
    b = s.encode('utf-8')
    return struct.pack('<H', len(b)) + b

def write_ase(path, size, palette, frames):
    names = list(frames)
    colors = sorted(set(palette.values()))
    # Paleta: índice 0 transparente, depois as cores do lutador
    pal = struct.pack('<III', len(colors) + 1, 0, len(colors)) + b'\0' * 8
    pal += struct.pack('<HBBBB', 0, 0, 0, 0, 0)
    for c in colors:
        pal += struct.pack('<HBBBB', 0, int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), 255)
    layer = struct.pack('<HHHHHHB3x', 3, 0, 0, 0, 0, 0, 255) + ase_string(os.path.basename(path).split('.')[0])
    tags = struct.pack('<H8x', len(names))
    tag_colors = [(182, 255, 42), (255, 122, 26), (0, 240, 255), (255, 42, 255)]
    for i, n in enumerate(names):
        r, g, b = tag_colors[i % len(tag_colors)]
        tags += struct.pack('<HHB8xBBBx', i, i, 0, r, g, b) + ase_string(n)
    body = b''
    for i, n in enumerate(names):
        pixels = zlib.compress(rgba(frames[n], palette, size))
        cel = struct.pack('<HhhBH7x', 0, 0, 0, 255, 2) + struct.pack('<HH', size, size) + pixels
        chunks = []
        if i == 0:
            chunks += [chunk(0x2004, layer), chunk(0x2019, pal), chunk(0x2018, tags)]
        chunks.append(chunk(0x2005, cel))
        data = b''.join(chunks)
        frame_header = struct.pack('<IHHH2xI', 16 + len(data), 0xF1FA, len(chunks), 200, len(chunks))
        body += frame_header + data
    header = struct.pack('<IHHHHHIHIIB3xHBBhhHH84x',
                         128 + len(body), 0xA5E0, len(names), size, size, 32, 1, 100, 0, 0, 0,
                         len(colors) + 1, 1, 1, 0, 0, 16, 16)
    assert len(header) == 128
    open(path, 'wb').write(header + body)


def write_png(path, grid, palette, size):
    from PIL import Image
    Image.frombytes('RGBA', (size, size), rgba(grid, palette, size)).save(path)


if __name__ == '__main__':
    name = sys.argv[1] if len(sys.argv) > 1 else 'vex'
    size, palette, frames = read_fighter(name)
    os.makedirs(OUT_DIR, exist_ok=True)
    ase = os.path.join(OUT_DIR, f'{name}.ase')
    write_ase(ase, size, palette, frames)
    for n, g in frames.items():
        write_png(os.path.join(OUT_DIR, f'{name}_{n}.png'), g, palette, size)
    print('ok:', ase, '| quadros:', ', '.join(frames), '| cores:', len(set(palette.values())))
