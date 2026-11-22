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
  const [a, m, d] = item.data.split('-');
  const dia = a + m + d;
  const linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Prumo//PT-BR//', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:prumo-' + item.id + '@prumo.local',
    'DTSTAMP:' + carimboUTC(new Date()),
    'SUMMARY:' + escaparICS(item.titulo)
  ];

  let gatilho;
  if (item.hora) {
    const [hh, mm] = item.hora.split(':');
    const inicio = new Date(+a, +m - 1, +d, +hh, +mm);
    const fim = new Date(inicio.getTime() + 60 * 60000);
    const local = x => {
      const p = n => String(n).padStart(2, '0');
      return x.getFullYear() + p(x.getMonth() + 1) + p(x.getDate()) + 'T' +
             p(x.getHours()) + p(x.getMinutes()) + '00';
    };
    linhas.push('DTSTART:' + local(inicio), 'DTEND:' + local(fim));
    gatilho = item.naHora ? 'PT0M' : '-PT' + (minutosAntes || 30) + 'M';   // "daqui a 40 min": na hora
  } else {
    const seguinte = new Date(+a, +m - 1, +d + 1);
    const p = n => String(n).padStart(2, '0');
    linhas.push('DTSTART;VALUE=DATE:' + dia,
                'DTEND;VALUE=DATE:' + seguinte.getFullYear() + p(seguinte.getMonth() + 1) + p(seguinte.getDate()));
    gatilho = 'PT9H';   // dia inteiro: avisa às 9 da manhã
  }

  if (item.texto && item.texto !== item.titulo) linhas.push('DESCRIPTION:' + escaparICS(item.texto));
  linhas.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escaparICS(item.titulo),
              'TRIGGER;RELATED=START:' + gatilho, 'END:VALARM',
              'END:VEVENT', 'END:VCALENDAR');
  return linhas.join('\r\n') + '\r\n';
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
