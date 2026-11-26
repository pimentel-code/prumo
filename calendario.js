/* calendario.js — entrega o compromisso para o calendário do próprio celular.
   É assim que o alarme toca com o Prumo fechado, sem servidor e sem internet. */

function escaparICS(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;')
                        .replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function carimboUTC(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' +
         p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
}

function montarICS(item, minutosAntes) {
  // "a cada 20 min": um compromisso curto para CADA aviso, cada um com o seu alarme.
  // (Um evento só com vários alarmes não serve: o iPhone guarda no máximo 2.)
  if (item.repetir && item.hora) {
    const [a, m, d] = item.data.split('-').map(Number);
    const [hh, mm] = item.hora.split(':').map(Number);
    const inicio = new Date(a, m - 1, d, hh, mm), fim = new Date(item.repetir.ate);
    const passo = item.repetir.cada * 60000;
    const eventos = [];
    for (let t = inicio.getTime(), k = 0; t <= fim.getTime() && k < 48; t += passo, k++) {
      eventos.push(blocoEvento(Object.assign({}, item, { id: item.id + '-' + k }), new Date(t), new Date(t + Math.min(passo, 15 * 60000)), 'PT0M'));
    }
    return embrulharICS(eventos);
  }
  // Vários horários ("remédio às 8h, 14h e 20h"): um compromisso para cada um, cada um com seu aviso.
  if (item.hora && item.maisHoras && item.maisHoras.length && !item.repetir) {
    return embrulharICS([].concat(...horasDe(item).map((h, k) => {
      const um = Object.assign({}, item, { hora: h, maisHoras: null, id: item.id + '-h' + k });
      const ics = montarICS(um, minutosAntes).split('\r\n');
      return ics.slice(ics.indexOf('BEGIN:VEVENT'), ics.lastIndexOf('END:VEVENT') + 1);
    })));
  }
  const [a, m, d] = item.data.split('-');
  if (item.hora) {
    const [hh, mm] = item.hora.split(':');
    const inicio = new Date(+a, +m - 1, +d, +hh, +mm);
    // Um alarme para cada antecedência (padrão: 1 h e 30 min antes). O iPhone guarda até 2 por evento.
    const lista = item.naHora ? [0] : (item.avisoAntes != null ? [item.avisoAntes]
      : [].concat(minutosAntes == null ? [60, 30] : minutosAntes)).slice(0, 2);
    const gatilho = lista.map(min => min ? '-PT' + min + 'M' : 'PT0M');   // "daqui a 40 min": na hora
    return embrulharICS([blocoEvento(item, inicio, new Date(inicio.getTime() + 60 * 60000), gatilho)]);
  }
  return embrulharICS([blocoEvento(item, new Date(+a, +m - 1, +d), null, 'PT9H')]);   // dia inteiro: avisa às 9h
}

function embrulharICS(eventos) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Prumo//PT-BR//', 'CALSCALE:GREGORIAN']
    .concat(...eventos, ['END:VCALENDAR']).join('\r\n') + '\r\n';
}

/* Um VEVENT com um ou mais alarmes (gatilho: texto ou lista). fim = null → dia inteiro. */
function blocoEvento(item, inicio, fim, gatilho) {
  const p = n => String(n).padStart(2, '0');
  const dia = x => x.getFullYear() + p(x.getMonth() + 1) + p(x.getDate());
  const local = x => dia(x) + 'T' + p(x.getHours()) + p(x.getMinutes()) + '00';
  const linhas = ['BEGIN:VEVENT', 'UID:prumo-' + item.id + '@prumo.local', 'DTSTAMP:' + carimboUTC(new Date()),
                  'SUMMARY:' + escaparICS(item.titulo)];
  if (fim) linhas.push('DTSTART:' + local(inicio), 'DTEND:' + local(fim));
  else linhas.push('DTSTART;VALUE=DATE:' + dia(inicio), 'DTEND;VALUE=DATE:' + dia(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1)));
  // "de segunda a sexta": o Calendário do celular repete sozinho, toda semana.
  if (item.semana && item.semana.length && !item.repetir) {
    linhas.push('RRULE:FREQ=WEEKLY;BYDAY=' + item.semana.map(d => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d]).join(','));
  }
  if (item.texto && item.texto !== item.titulo) linhas.push('DESCRIPTION:' + escaparICS(item.texto));
  for (const g of [].concat(gatilho)) {
    linhas.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escaparICS(item.titulo),
                'TRIGGER;RELATED=START:' + g, 'END:VALARM');
  }
  linhas.push('END:VEVENT');
  return linhas;
}

function nomeArquivoICS(item) {
  const limpo = semAcento(item.titulo).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  return (limpo || 'compromisso') + '.ics';
}

/* Tenta o menu de compartilhar (melhor no iPhone: vai direto pro Calendário).
   Se não der, baixa o arquivo — o celular reconhece e oferece adicionar. */
async function mandarParaCalendario(item, minutosAntes) {
  const texto = montarICS(item, minutosAntes);
  const nome = nomeArquivoICS(item);
  const blob = new Blob([texto], { type: 'text/calendar;charset=utf-8' });

  if (navigator.canShare) {
    try {
      const arquivo = new File([blob], nome, { type: 'text/calendar' });
      if (navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo] });
        return 'compartilhado';
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelado';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
  return 'baixado';
}

/* Alternativa para quem usa Google Agenda: abre já preenchido. */
function linkGoogleAgenda(item) {
  const [a, m, d] = item.data.split('-');
  let datas;
  if (item.hora) {
    const [hh, mm] = item.hora.split(':');
    const ini = new Date(+a, +m - 1, +d, +hh, +mm);
    const fim = new Date(ini.getTime() + 3600000);
    datas = carimboUTC(ini) + '/' + carimboUTC(fim);
  } else {
    const p = n => String(n).padStart(2, '0');
    const seg = new Date(+a, +m - 1, +d + 1);
    datas = a + m + d + '/' + seg.getFullYear() + p(seg.getMonth() + 1) + p(seg.getDate());
  }
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
         '&text=' + encodeURIComponent(item.titulo) + '&dates=' + datas;
}
