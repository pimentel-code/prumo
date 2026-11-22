#!/usr/bin/env python3
"""Gera TODOS os ícones do Prumo a partir de um desenho só.

    python3 gerar-icones.py

Refaz: icones/ (site e iPhone), os mipmap do Android (ícone comum, redondo e o
adaptativo) e a tela de abertura (splash). O desenho: fio de prumo branco, com
a ponta apontando para uma linha de nível, em fundo verde-azulado degradê.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

PASTA = Path(__file__).resolve().parent
RES = PASTA / 'android/app/src/main/res'
COR_CLARA = (43, 179, 160)    # #2bb3a0
COR_ESCURA = (10, 90, 83)     # #0a5a53
SS = 4                        # desenha 4x maior e reduz: bordas lisas


def degrade(lado):
    """Fundo em diagonal (claro em cima à esquerda) com um brilho suave."""
    pequeno = Image.new('RGB', (64, 64))
    px = pequeno.load()
    for y in range(64):
        for x in range(64):
            t = min(1, max(0, (x + y * 1.4) / (63 * 2.4)))
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(COR_CLARA, COR_ESCURA))
    fundo = pequeno.resize((lado, lado), Image.BICUBIC)
    brilho = Image.new('L', (lado, lado), 0)
    ImageDraw.Draw(brilho).ellipse((-lado * .35, -lado * .45, lado * .75, lado * .55), fill=60)
    brilho = brilho.filter(ImageFilter.GaussianBlur(lado * .12))
    return Image.composite(Image.new('RGB', (lado, lado), (255, 255, 255)), fundo, brilho)


def prumo(lado, escala=1.0):
    """O desenho em branco sobre transparente, centralizado. escala<1 encolhe."""
    L = lado * SS
    img = Image.new('RGBA', (L, L), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = L / 2

    def p(x, y):  # coordenadas de 0 a 1, encolhidas em volta do centro
        return (cx + (x - .5) * L * escala, L / 2 + (y - .5) * L * escala)

    branco = (255, 255, 255, 255)
    # barra de cima
    x0, y0 = p(.31, .19); x1, y1 = p(.69, .25)
    d.rounded_rectangle((x0, y0, x1, y1), radius=(y1 - y0) / 2, fill=branco)
    # fio
    x0, y0 = p(.483, .22); x1, y1 = p(.517, .48)
    d.rectangle((x0, y0, x1, y1), fill=branco)
    # argola do peso
    x0, y0 = p(.452, .462); x1, y1 = p(.548, .51)
    d.rounded_rectangle((x0, y0, x1, y1), radius=(y1 - y0) / 2.2, fill=branco)
    # o peso: losango alongado, com a face direita levemente sombreada (volume)
    topo_e, topo_d = p(.44, .5), p(.56, .5)
    meio_e, meio_d = p(.365, .61), p(.635, .61)
    ponta = p(.5, .815)
    d.polygon([topo_e, topo_d, meio_d, ponta, meio_e], fill=branco)
    d.polygon([p(.5, .5), topo_d, meio_d, ponta], fill=(214, 238, 234, 255))
    # linha de nível embaixo da ponta: "no prumo"
    x0, y0 = p(.36, .85); x1, y1 = p(.64, .878)
    d.rounded_rectangle((x0, y0, x1, y1), radius=(y1 - y0) / 2, fill=(255, 255, 255, 140))

    # sombra suave do desenho, para ele "saltar" do fundo
    alfa = img.split()[3]
    sombra = Image.new('RGBA', (L, L), (0, 40, 36, 0))
    sombra.putalpha(alfa.point(lambda a: a * .35).filter(ImageFilter.GaussianBlur(L * .018)))
    sombra = ImageChops.offset(sombra, 0, round(L * .015))
    final = Image.alpha_composite(sombra, img)
    return final.resize((lado, lado), Image.LANCZOS)


def icone(lado, escala=1.0, forma='quadrado'):
    fundo = degrade(lado).convert('RGBA')
    final = Image.alpha_composite(fundo, prumo(lado, escala))
    if forma == 'quadrado':
        return final
    mascara = Image.new('L', (lado * SS, lado * SS), 0)
    md = ImageDraw.Draw(mascara)
    if forma == 'redondo':
        md.ellipse((0, 0, lado * SS - 1, lado * SS - 1), fill=255)
    else:  # arredondado
        md.rounded_rectangle((0, 0, lado * SS - 1, lado * SS - 1), radius=lado * SS * .22, fill=255)
    final.putalpha(mascara.resize((lado, lado), Image.LANCZOS))
    return final


def main():
    ic = PASTA / 'icones'
    # Site / iPhone: quadrado cheio (o próprio sistema arredonda os cantos).
    icone(180).convert('RGB').save(ic / 'icone-180.png')
    icone(192).convert('RGB').save(ic / 'icone-192.png')
    icone(512).convert('RGB').save(ic / 'icone-512.png')
    # "maskable": o Android pode cortar em círculo — desenho dentro da zona segura.
    icone(512, escala=.78).convert('RGB').save(ic / 'icone-mascara-512.png')

    if not RES.exists():
        print('Sem a pasta android/ — só os ícones do site foram gerados.')
        return
    tamanhos = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for dpi, lado in tamanhos.items():
        pasta = RES / f'mipmap-{dpi}'
        icone(lado, escala=.92, forma='arredondado').save(pasta / 'ic_launcher.png')
        icone(lado, escala=.82, forma='redondo').save(pasta / 'ic_launcher_round.png')
        # Adaptativo: frente transparente em tela de 108dp; só o miolo de 66dp é seguro.
        frente = lado * 108 // 48
        prumo(frente, escala=.62).save(pasta / 'ic_launcher_foreground.png')

    # Tela de abertura: degradê + ícone arredondado no meio.
    for arq in RES.glob('drawable*/splash.png'):
        w, h = Image.open(arq).size
        lado = max(w, h)
        fundo = degrade(lado).resize((lado, lado)).crop(((lado - w) // 2, (lado - h) // 2, (lado - w) // 2 + w, (lado - h) // 2 + h))
        t = round(min(w, h) * .4)
        marca = prumo(t, escala=1.0)
        fundo = fundo.convert('RGBA')
        fundo.alpha_composite(marca, ((w - t) // 2, (h - t) // 2))
        fundo.convert('RGB').save(arq)
    print('Ícones gerados.')


if __name__ == '__main__':
    main()
