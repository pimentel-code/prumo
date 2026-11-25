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

## 22/11/2026 — parcelas ditas de vários jeitos (v1.4)
- Ele falou "comprei sapato de 200 reais em 4 vezes" e só entrou o valor cheio: o microfone do
  Android escreve número pequeno por extenso ("em quatro vezes"), e acharParcelas só aceitava
  algarismo. Agora aceita: por extenso (PARCELAS_FALADAS), "dividido/parcelado/parcelei/dividi",
  "no cartão em", "parcelas/prestações", "parcelei o sapato de 200 em 4" (verbo antes, "em N" depois).
- limparTitulo ignora pedaço só de pontuação ("Sapato de ," virava título).

## 22/11/2026 — compra parcelada: valor cheio no mês da compra, parcelas a partir do seguinte (v1.5)
- Pedido dele: "sapato 300 em 3x" → novembro mostra a compra de 300; dezembro a 1ª parcela de 100.
- criarParcelas cria um item `compra: n` (valor cheio, data da compra, mesmo grupo) que NÃO
  entra em soma nenhuma (somaNoTotal: Saiu, Ainda vai sair, Onde foi o dinheiro, gasto de hoje,
  widget) — senão o dinheiro contaria duas vezes. Parcelas: somarMeses(inicio, k + 1).
- Visual: valor cinza "300,00 em 3x" + "🛍️ compra em 3x · 1ª parcela em dezembro".
- Excluir pelo Editar apaga a compra e as parcelas. Compras antigas (antes da 1.5) ficam como estavam.

## 23/11/2026 — esfera ao abrir + visual escuro em degradê (v1.7, TESTE)
- Pedido dele a partir de um print do Dribbble: ao abrir, um cartão com esfera de partículas
  "como uma IA esperando". Decisões dele: aparece toda vez (chave em Ajustes → "Esfera ao abrir"),
  microfone espera o toque, e o app inteiro + a esfera nas cores da imagem.
- esfera.js: canvas com 3200 pontos (espiral de Fibonacci), degradê azul→roxo→rosa→laranja, pulsa com
  o volume da voz. Abre: ao iniciar, ao voltar após 10 min fora, no 🎤 da caixa e no "Falar" do widget.
  Mostra "o que entendeu" → Guardar (salvarRascunho) / Corrigir (fecha e deixa a confirmação completa);
  ✕ descarta. Por dentro é o interpretador de sempre (sem IA).
- Voz: método nativo novo `escutar` (SpeechRecognizer + RECORD_AUDIO, eventos vozVolume/vozParcial,
  `pararEscuta`); se falhar, cai na janelinha antiga (`ouvir`). Site: webkitSpeechRecognition se houver.
- Visual: sempre escuro (sem tema claro), --degrade/--degrade-botao no estilo.css; widget escuro com botão
  em degradê. Ícone e splash continuam verde-azulados (não mexi).
- NÃO testado no celular: permissão do microfone, esfera pulsando com a voz, widget novo.
- Backup do anterior em backups/antes-esfera-2026-11-23/.
- A prova "revisão do que ficou para trás" falha à noite (data em UTC no teste) — já falhava antes.
- 1.8 (TESTE, 23/11): ícone, ícone adaptativo (drawable/fundo_icone.xml) e splash refeitos no degradê pelo gerar-icones.py; splash agora escura com brilho e o ícone no meio. Backup dos antigos em backups/antes-esfera-2026-11-23/ (icones/ e res/).

## 23/11/2026 — miolo silencioso (v1.9, TESTE)
- Pedido dele: atualizar sem ninguém ver, no celular dele e no dos amigos.
- @capgo/capacitor-updater 8.54.2 em modo MANUAL, sem a nuvem da Capgo (statsUrl/updateUrl/channelUrl
  vazios no capacitor.config.json). miolo.js: notifyAppReady ao abrir (senão volta ao anterior em 10 s);
  4 s depois (e ao voltar ao app, no máx. a cada 30 min) lê /releases do GitHub, escolhe a mais nova com
  miolo.zip, liberada (ou de teste se Ajustes → "Versões de teste" ligado) e cujo [nativo:N] ≤ versionCode;
  baixa e chama next() → troca quando o app vai para o fundo. Versão que deu erro não é rebaixada.
- versao-miolo.js (PRUMO_MIOLO) e android/nativo-minimo.txt são gerados pelo publicar-apk.sh. Ele compara
  com a última tag: mudou android/, capacitor.config.json ou package*.json → nativo = versão nova
  (faixa "Versão nova" pede o APK); senão mantém → só o miolo, silencioso.
- atualizacao.js: a faixa só aparece se o [nativo:N] da última estável > instalado.
- 1.9 é nativa (traz a peça): amigos precisam instalar UMA vez pela faixa. Da 1.10 em diante, silencioso.
- Provas: testes/miolo-prova.js (11). Corrigida a prova da revisão (data em UTC à noite).
- NÃO testado em aparelho: a troca real do miolo e se os dados ficam (devem: mesma origem). Teste planejado:
  ele instala a 1.9, liga "Versões de teste", eu publico uma 1.10 só de miolo e ele confere.
- 1.11 (TESTE, 23/11): Ajustes refeitos no padrão Android/iPhone (tela cheia, grupos em cartão, ícones coloridos SVG, chaves, valor à direita, subpáginas avisar-antes/palavras/alarme/privacidade; App.subAjustes + voltar). Defeito pego no print: o clique passava o Event como 'sub' → painelAjustes ignora não-string.
- 1.12 (TESTE, 23/11, NATIVA): verde antigo que sobrou: windowSplashScreenBackground (abertura do Android 12+), AlarmeActivity (tela do alarme → degradê), AlarmeService/atalhos/lightColor, QR do convite (svg+png escuros). Aviso de backup saiu da tela principal (só nos Ajustes). Busca que achou: grep -i das cores antigas, incluindo 0xFF… do Java.
- 1.13 (TESTE, 23/11, só miolo): esfera FIXA na tela Hoje (EsferaHoje em esfera.js; <section id=esferaHoje> antes do #conteudo; atualizar() a cada render). Toque nela ou no 🎤 → escuta ali mesmo (pulsa com a voz, mostra o texto) → confirmação de sempre. Janela ao abrir REMOVIDA; janela só se a esfera estiver desligada. Desenho economiza: pausa fora da tela/aba e 30 fps parada. Ajustes: "Esfera na tela Hoje".
- 1.14 (TESTE, 23/11, NATIVA forçada com FORCAR_NATIVO=1): no celular dele o silencioso NÃO funcionou (ficou em 1.12, 'Procurar' não achou a 1.13; causa desconhecida, sem log). Mudanças: diário de etapas (prumo.miolo.diario) + Ajustes → Diagnóstico; notifyAppReady no início do iniciar(); versão do pacote '1.N'; falha não bloqueia para sempre (1 tentativa/dia, Procurar força); faixa a cada 30 min. Próximo: ele instala a 1.14, eu publico uma 1.15 só miolo e ele manda print do Diagnóstico.
- 1.15 (TESTE, 23/11, só miolo): dia vazio com esfera ligada = só a esfera centralizada (telaHoje devolve '' e body.hoje-vazio). Com itens no dia, a lista continua abaixo da esfera. Serve de teste do silencioso pós-1.14.
- 1.16 (TESTE, 23/11, só miolo): CAUSA do silencioso falhar = API do GitHub com limite de 60 consultas/h por IP (erro 403 visto no Obtainium; rate_limit 0 restantes). App agora lê canais.json (raw.githubusercontent.com, sem limite) com {estavel, teste}: {codigo, nativo, apk, miolo, notas}; API só de reserva. publicar-apk.sh grava o canal teste (canais.py), aprovar-apk.sh o estável (commit+push no main). Só a última de cada canal conta (versão que exige APK não cai para miolo antigo).
- 1.18 (TESTE, 23/11, NATIVA forçada): 2ª causa do silencioso = @capgo exige checksum (SHA-256 hex do zip) no download ('Checksum required' → 'Failed to download'); canais.py grava sha256, miolo.js manda checksum; sem sha (reserva pela API) não baixa miolo. Faixa avisa versão de teste a quem testa. Instalar por QR (~/Imagens/prumo-1.18-qr.png); depois 1.19 só miolo = prova.
- 23/11/2026: SILENCIOSO PROVADO no celular dele (1.18 → 1.19 sozinho, sem instalar). Causas que foram consertadas: limite 60/h da API (canais.json) e checksum SHA-256 obrigatório.

## Lembrete repetido (1.20, teste em 24/11/2026)
- Frases: "a cada 20 minutos", "a cada meia hora/hora/1h30", "de 20 em 20 min", "de meia em meia hora", "de hora em hora".
  Fim: "até as 18h", "até meia-noite", "por/durante 2 horas", "o dia todo" (até 22h). Sem fim dito: 3 horas. Mínimo 5 min, máximo 12 h.
- Vira compromisso com `repetir: { cada, ate }`; data/hora = 1º aviso (sem hora dita: agora + intervalo). `naHora` = sem antecedência.
- Android: notificação comum (canal avisos), ids "id#k", até 48 por série, MAX_AVISOS 150. Botões Parar (encerra a série agora, item fica) e Feito.
  Alarme só se a frase pedir ("alarme a cada 30 min").
- iPhone (.ics): um evento cobrindo a série, um VALARM por passo (o iPhone pode guardar só 2 avisos — NÃO conferido).
- Confirmação: campos "Lembrar a cada" e "Até"; compromisso com hora ganha o botão "🔁 Lembrar várias vezes".
