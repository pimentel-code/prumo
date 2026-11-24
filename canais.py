#!/usr/bin/env python3
"""Atualiza o canais.json (o que o app lê para saber da versão nova).

    python3 canais.py teste   N NATIVO "notas"   → depois do publicar
    python3 canais.py estavel N NATIVO "notas"   → depois do aprovar
"""
import json, sys
from pathlib import Path

ARQ = Path(__file__).resolve().parent / 'canais.json'
BASE = 'https://github.com/pimentel-code/prumo/releases/download/v1.{n}/'

canal, n, nativo = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
notas = (sys.argv[4] if len(sys.argv) > 4 else '').replace('[nativo:%d]' % nativo, '').strip()[:400]
d = json.loads(ARQ.read_text(encoding='utf-8'))
d[canal] = {'codigo': n, 'nativo': nativo, 'apk': BASE.format(n=n) + 'Prumo.apk',
            'miolo': BASE.format(n=n) + 'miolo.zip', 'notas': notas}
# O teste nunca fica atrás do estável (quem testa recebe o estável também).
if canal == 'estavel' and d.get('teste', {}).get('codigo', 0) < n:
    d['teste'] = dict(d[canal])
ARQ.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('canais.json:', canal, '→ 1.%d (nativo %d)' % (n, nativo))
