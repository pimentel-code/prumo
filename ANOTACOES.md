# Prumo — anotações do projeto

Última sessão: **9 de setembro de 2026**.

## O que é

Aplicativo pessoal para anotar gastos, compromissos, tarefas e recados
escrevendo ou ditando uma frase solta. Nasceu como resposta ao "Meu Assessor"
(assistente pago que funciona no WhatsApp), sem as partes que não interessavam.

## Decisões que já estão tomadas

| Assunto | Decisão | Por quê |
|---|---|---|
| WhatsApp | **Fora** | Não envolver a Meta, nem risco de bloqueio de número |
| Acesso ao banco | **Fora** | Não dar extrato bancário a empresa nenhuma |
| Sincronizar com o PC | **Fora, por enquanto** | Ele não precisa; simplifica muito |
| Formato | **PWA** (página instalável) | Único jeito de instalar no iPhone sem a App Store, e é o mesmo código no Android |
| Tecnologia | HTML/CSS/JS puro, sem framework | Dura anos sem manutenção; ele consegue ler o código |
| Onde ficam os dados | **Só no aparelho** (`localStorage`) | Privacidade; em troca, backup é peça central |
| Inteligência | **Regras**, sem IA | Funciona sem internet e sem depender de conta nem de chave paga |
| Alarme na hora certa | **Delegado ao calendário do celular** (`.ics`) | O iPhone não deixa PWA agendar aviso; o calendário nativo faz isso perfeito |
| Hospedagem | GitHub Pages | Grátis, permanente, o código fica dele |
| Conta | **pimentel-code** (pessoal), não a do cartório | O Prumo é pessoal |
| Estratégia | Fase 1 agora, fase 2 depois de usar | Ajustar com base no uso real, não no palpite |

## Os arquivos

```
~/Projetos/Sistemas/Prumo/
├── index.html            a página e a estrutura das telas
├── estilo.css            visual, claro e escuro, margens de iPhone e Android
├── interpretador.js      o coração: transforma frase solta em registro
├── dados.js              guarda, lê, exporta e importa (localStorage)
├── calendario.js         gera o arquivo .ics e o link do Google Agenda
├── app.js                as quatro telas, a confirmação, os painéis
├── sw.js                 faz o app funcionar sem internet
├── manifest.webmanifest  nome, cores e ícones do app instalado
├── icones/               fio de prumo branco em fundo verde-azulado
└── testes/rodar.sh       roda tudo com o gjs (não precisa de Node)
```

## Como o interpretador decide

1. Acha a **hora** (`14h`, `14:30`, `8 da noite`, `meio-dia`) e marca esse pedaço.
2. Acha a **data** (`hoje`, `quinta`, `dia 12`, `12/03`, `semana que vem`, `daqui a 15 dias`).
3. Acha o **valor** no que sobrou — por isso "dia 12" nunca vira R$ 12,00.
4. Decide o **tipo** pelo verbo: `paguei` (passado) é gasto lançado, `pagar`
   (infinitivo) é tarefa a fazer. Hora presente puxa para compromisso.
5. Escolhe a **categoria** por palavra-chave, consultando primeiro as palavras
   que você mesmo ensinou ao corrigir.
6. O que sobrou da frase vira o **título**, sem as preposições soltas.

Regra fina: data sem ano que já passou, em compromisso ou tarefa, vira do ano
que vem — `consulta 12/03` dita em setembro marca 2027.

## Testes

```
~/Projetos/Sistemas/Prumo/testes/rodar.sh            tudo (leva ~10 s)
~/Projetos/Sistemas/Prumo/testes/rodar.sh rapido     só as instantâneas, sem navegador
```

São três camadas:

1. **24 frases no interpretador** — `gjs`, instantâneo.
2. **14 provas no app inteiro** com navegador simulado — `gjs`, instantâneo.
3. **15 provas num navegador de verdade** (Playwright), em tela de iPhone e de
   Android ao mesmo tempo. É a camada que alcança o que as outras não alcançam:
   toque nos botões, troca de telas, dado que sobrevive a reabrir o app,
   tamanho dos alvos de toque, e **o app abrindo sem internet**.

O Node.js foi instalado em 09/09/2026 (`pkexec dnf install nodejs npm`) só para
isso. Se algum dia o Node sumir, o `rodar.sh` avisa e pula a camada 3 sozinho —
as duas primeiras continuam funcionando.

O Safari de verdade não dá para testar aqui: o WebKit do Playwright espera
bibliotecas do Ubuntu que não existem no Fedora. O teste no iPhone continua
sendo no aparelho.

## Consertado em 09/09/2026 (achados pelas provas de navegador)

| O que estava errado | Por quê |
|---|---|
| A barra de busca aparecia **sempre**, sem tocar na lupa | `.entrada { display: flex }` vencia o `hidden` do HTML |
| A tela Dinheiro **rolava de lado** com valores altos | `1fr` na grade tem largura mínima automática |
| Marcar tarefa feita: alvo de 24×24 px | O dedo erra; agora são 44×44 invisíveis em volta do desenho de 24 |
| Setas de mês ‹ ›: alvo de 20×31 px | Idem — agora 44×44 |

Os três primeiros têm prova que **falha** se alguém desfizer a correção.

## No ar desde 09/09/2026

**https://pimentel-code.github.io/prumo/**

Repositório público em `github.com/pimentel-code/prumo`, conta pessoal
(a `2RIcartorio` segue guardada no `gh`; `gh auth switch` alterna).
Os commits usam o e-mail-máscara do GitHub, não o Gmail dele.

As 15 provas de navegador rodam também contra o site publicado:

```
PRUMO_URL=https://pimentel-code.github.io/prumo/ npx playwright test
```

Caminhos nas provas são **relativos** (`index.html`, não `/index.html`) — com
barra inicial o GitHub Pages perde a subpasta `/prumo/` e nada carrega.

## Como o aviso funciona (leia antes de reclamar que não tocou)

**O Prumo não toca alarme sozinho, e isso é de propósito.** O iPhone não deixa
uma página instalada agendar aviso, e notificação de verdade exigiria um
servidor — o que contraria "dados só no aparelho". Quem avisa é o **calendário
do próprio celular**: o botão **Pôr no calendário** gera um arquivo `.ics` com
alarme dentro, e o iPhone assume dali para a frente.

- Item **com hora** → evento na hora certa, alarme **30 min antes**.
- Item **sem hora** (tarefa "amanhã") → evento de dia inteiro, alarme **às 9h**.

Corrigido em 09/09/2026, depois do primeiro uso real:

| O que estava errado | Agora |
|---|---|
| Só **compromisso** oferecia o botão. "Me lembrar de X amanhã" vira **tarefa**, e tarefa não tinha caminho nenhum para o alarme | Tarefa com prazo também oferece |
| Ele precisava descobrir o botão sozinho, na lista | Ao guardar algo com data, aparece na hora: *"Guardado. Quer ser avisado na hora?"* |
| "me lembrar de pagar o IPTU" virava o título torto **"Me de pagar o IPTU"** | Vira **"Pagar o IPTU"** |

O título torto era ordem de lista: `acharPalavra` devolve a **primeira** que
casa, e `'lembrar'` vinha antes de `'me lembrar de'`. As frases compridas agora
vêm primeiro.

## O que falta

1. **Instalar no iPhone**: abrir o endereço **no Safari** (não no Chrome),
   Compartilhar → Adicionar à Tela de Início.
2. **Decidir sobre o botão de microfone dentro do app.** Hoje o ditado é pelo
   microfone do teclado, que funciona sempre e até sem internet no iPhone novo.
   Um botão próprio economizaria um toque, mas no iPhone usaria os servidores da
   Apple, ou seja, exigiria internet. Ficou a pergunta na mesa.
4. **Testar com frases reais dele** — é assim que se descobre o que o
   interpretador ainda não pega do jeito dele falar.

## Fase 2 (só depois de uma ou duas semanas de uso)

- Categorias trocadas pelas que aparecerem de verdade na vida dele
- Recorrências ("todo dia 10 vence o condomínio")
- Relatório do mês e exportar para planilha
- Notificação própria, **se** o calendário nativo não tiver bastado
- Ler foto de comprovante — deixado para depois de propósito: soa ótimo e quase
  ninguém usa

## Lembretes práticos

- No iPhone, instalar **só funciona pelo Safari** (Compartilhar → Adicionar à
  Tela de Início). Pelo Chrome do iPhone não aparece a opção.
- Enquanto não estiver publicado, dá para espiar do celular no mesmo wi-fi, mas
  sem instalar nem funcionar offline — isso exige endereço seguro (https).
- Os dados existem **só no aparelho**. Backup não é enfeite.

## Versão Android (21/11/2026)

APK próprio com **avisos tocados pelo próprio Prumo**, sem calendário e sem servidor.
O site (iPhone) continua igual, com o "Pôr no calendário".

- Embalado com **Capacitor 8** (`capacitor.config.json`, pasta `android/`).
  O mesmo código serve os dois: `Avisos.nativo` diz se está no app Android.
- `avisos.js`: a cada salvamento cancela e reagenda tudo (até 60 avisos mais próximos)
  pelo despertador do sistema (`@capacitor/local-notifications`, `allowWhileIdle`).
  Compromisso com hora: X min antes (Ajustes: na hora/10/30/60/120, padrão 30).
  Sem hora: 9h do dia. Notificação com botões **Adiar 10 min** e **Feito**.
- Permissão `USE_EXACT_ALARM` no manifesto: alarme exato liberado sem ir em Ajustes.
- Backup no Android: grava no app e abre o compartilhar (`@capacitor/filesystem` + `share`).
- Botão voltar do Android fecha painel/rascunho/busca antes de sair (`@capacitor/app`).
- **Gerar o APK:** `prumo apk` (ou `./montar-apk.sh`) → `Prumo.apk` nesta pasta.
  Precisa Java 21 (`jdk21-openjdk`) e o kit Android em `~/Android/Sdk`.
- **Chave de assinatura:** `~/.android/debug.keystore` (cópia em
  `~/Documentos/Prumo-chave-android`). Sem ela, a versão nova não instala por cima
  da antiga — teria que desinstalar e perder os dados.
- Provas: `testes/avisos-prova.js` (17, com Android simulado em `testes/stubs-android.js`).
  As provas rápidas agora rodam com Node quando não há `gjs` (CachyOS).
- Não testado em Android simulado: a virtualização (SVM) está desligada na BIOS.

### Alarme de verdade + microfone (21/11/2026, mesma noite)

- **Alarme:** frase com "alarme", "despertar" ou "acord…" (e hora) vira `alarme: true`;
  hora já passada hoje vai para amanhã. Também há a caixinha "⏰ Tocar como alarme"
  na confirmação/Editar. Alarme toca na hora exata (sem antecedência).
- Código nativo próprio em `android/app/src/main/java/io/github/pimentelcode/prumo/`:
  `Alarmes` (setAlarmClock + lista salva p/ reiniciar), `AlarmeReceiver`,
  `AlarmeService` (som de alarme do celular em volta + vibração, para sozinho em 10 min),
  `AlarmeActivity` (tela acesa por cima do bloqueio: Parar / Adiar 10 min),
  `PrumoPlugin` (ponte JS: definirAlarmes, testarAlarme, estadoAlarme, ouvir).
- **Microfone 🎤:** botão ao lado do Anotar (só no APK) abre o reconhecimento de
  voz do Android em pt-BR; o texto cai na mesma confirmação de quando se digita.
- Android 14+ pode negar "notificação em tela cheia": aí o alarme toca mas só
  aparece na barra. Ajustes → Alarme mostra o botão para liberar.

## 22/11/2026 — tutorial da primeira vez + visual novo

- Testado no celular dele (21–22/11): avisos, alarme e lançamento de gastos funcionando.
- **Tutorial** (`tutorial.js`): 6 telas que passam com o dedo (scroll-snap), na primeira
  abertura; fica marcado em `localStorage['prumo.tutorial.visto']`. Rever: Ajustes →
  "Ver o tutorial de novo". A tela de avisos muda entre app Android e site/iPhone.
  Botão "voltar" do Android anda para trás no tutorial.
- **Visual**: cada tipo tem cor própria (Saiu vermelho, Entrou verde, Compromisso azul,
  Tarefa âmbar, Anotação roxo) via `data-tipo` no CSS; selo à esquerda do item (emoji da
  categoria nos gastos, hora nos compromissos); "Entendi assim" na confirmação; exemplos
  tocáveis ao focar a caixa vazia; resumo do dia na aba Hoje; cartão de saldo e barras
  coloridas com % no Dinheiro; abas com marcador; topo em degradê com a data.
- **Ícone novo**: `python3 gerar-icones.py` refaz site, iPhone, mipmaps do Android (fundo
  adaptativo em `drawable/fundo_icone.xml`) e a splash. Antigos em
  `backups/antes-tutorial-visual-2026-11-22/`.
- Provas: 24 navegador × 2 telas = 48, incluindo 4 novas do tutorial/exemplos.

## 22/11/2026 (tarde) — widget, atalhos, parcelas, contas fixas e revisão

- **Widget 4×1** (`PrumoWidget.java`, `layout/widget_prumo.xml`): gasto de hoje + próximo
  compromisso/tarefa, botões 🎤 Falar e ✍️ Anotar. O JS manda o resumo a cada salvamento
  (`Avisos.atualizarWidget` → `Prumo.atualizarWidget`); o Java escolhe o que mostrar agora
  e o Android o redesenha a cada 30 min (virada do dia).
- **Atalhos do ícone** (`xml/shortcuts.xml`): Falar / Anotar. Widget e atalhos abrem a
  MainActivity com ação `…FALAR`/`…ANOTAR`; o JS busca com `acaoPendente()` na abertura e no
  `resume`. "Anotar" usa `mostrarTeclado()` (o foco sozinho não abre o teclado no Android).
- **Parcelas**: "TV 1.200 em 10x", "10x de 120", "parcelado em 12" → N lançamentos (`grupo`,
  `parcela: '3/10'`), centavos na última. Parcela de data futura não conta em "Saiu": entra em
  "Ainda vai sair". Editar → "Excluir todas as parcelas".
- **Contas fixas** (`Dados.fixas()`, entram no backup): "aluguel 900 todo dia 5", "por mês",
  "salário 4200 todo dia 5" (entrada). São virtuais: cada mês mostra a pagar até tocar em
  "Paguei", que cria um lançamento com `fixaId`. Se o dia já passou no mês da criação, começa
  no mês que vem. Aviso às 9h do vencimento com botões "Paguei" / "Lembrar amanhã".
- **Revisão do que ficou para trás**: faixa em Hoje → uma de cada vez (Já fiz / Amanhã /
  Semana que vem / Apagar). Aviso no domingo 19h (id 2) se houver atrasados; liga/desliga
  em Ajustes → Avisos. Notificação comum ganhou o botão "Amanhã".
- Corrigido: com a confirmação aberta o topo deixa de ser fixo (`body.confirmando`) —
  em celular pequeno o "Guardar" ficava escondido atrás das abas.
- Provas: 28 × 2 no navegador + 22 novas nas rápidas. Widget/atalhos só testáveis no aparelho.
- Tutorial atualizado (22/11, noite): + "Parcelas e contas fixas", "Nada fica acumulado" e, só no
  app Android, "Anote sem abrir o app" (widget/atalhos) → 9 telas no Android, 8 no site.
  Botão **?** fixo no topo (`#btAjuda`) reabre a apresentação a qualquer hora (além de Ajustes).

## 22/11/2026 (noite) — alarme por cima de tudo e "daqui a 40 minutos"
- Tela do alarme com o celular DESBLOQUEADO: o AlarmeService chama startActivity(AlarmeActivity)
  além da notificação de tela cheia. O Android só aceita se o Prumo tiver "aparecer sobre outros
  apps" (SYSTEM_ALERT_WINDOW, no manifest); sem ela vira só a faixa no alto, como antes.
  Ajustes e o recado de "Guardado" oferecem o botão de liberar (abrirAjustesSobrepor).
- interpretador.js: acharDaqui() — "daqui a 40 minutos", "daqui 2 horas", "em meia hora",
  "daqui a uma hora e meia", "em 1h30", números por extenso. Roda antes de acharHora.
  Item ganha naHora: o aviso toca na hora exata (sem os 30 min de antecedência), também no .ics.
- Alarme reconhece "alarma", "alarmar", "me chama/chame"; título só de palavras de alarme vira "Alarme".
- Spotify/Deezer no alarme: descartado (exige conta de desenvolvedor, internet e Premium; fere
  "dados só no aparelho"). Alternativa oferecida: escolher uma música salva no celular.

## 22/11/2026 — atualização automática pelo Obtainium
- Versão em android/versao.properties (codigo=N → versionCode N, versionName "1.N").
- `./publicar-apk.sh "o que mudou"` (ou `prumo atualizar "..."`): provas rápidas → soma 1 na
  versão → monta APK → commit + push (atualiza o site também) → release vN no GitHub com Prumo.apk.
- No celular, o Obtainium acompanha https://github.com/pimentel-code/prumo e instala sozinho.
- Primeira release: v1.2 (22/11/2026). gh no CachyOS logado em pimentel-code (2RIcartorio expirado).

## 22/11/2026 — compartilhar com amigos: teste × estável, aviso no app, convite
- Dois canais no GitHub:
  - `prumo atualizar "o que mudou"` → pré-release (TESTE). Só o Obtainium do dono, com
    "incluir pré-lançamentos", recebe. Vai para o ramo main.
  - `prumo aprovar` → vira release "latest" (ESTÁVEL) e empurra o código dela para o ramo
    `estavel`, de onde sai o site (GitHub Pages trocado de main para estavel em 22/11).
- atualizacao.js: o app Android pergunta à API do GitHub (releases/latest, nunca pré-release)
  no máximo a cada 6 h; versão maior que o versionCode instalado → faixa "Versão nova" em
  qualquer aba. "Atualizar": PrumoPlugin.instalarAtualizacao baixa o APK (só de
  github.com/pimentel-code/prumo/releases/download/) para o cache e abre o instalador.
  Primeira vez pede "Permitir desta fonte" (REQUEST_INSTALL_PACKAGES). Ajustes → Procurar atualização.
- instalar.html: página de convite (Android: baixa releases/latest/download/Prumo.apk com passo
  a passo; iPhone: Safari → Tela de Início; PC: QR code). QR em icones/convite-qr.{svg,png}
  (gerado com o pacote npm qrcode). `prumo convite` mostra link e QR.
- Só existe no ar depois do primeiro `prumo aprovar` (a página mora no ramo estavel).
