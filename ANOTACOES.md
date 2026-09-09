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
~/Prumo/
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
~/Prumo/testes/rodar.sh            tudo (leva ~10 s)
~/Prumo/testes/rodar.sh rapido     só as instantâneas, sem navegador
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
