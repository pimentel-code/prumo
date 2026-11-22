# Prumo — gastos, agenda e tarefas por frase solta

Aplicativo pessoal de celular. Você escreve (ou dita) uma frase solta —
"almoço 32 reais", "dentista quinta 14h", "comprar pilha" — e ele entende
sozinho se aquilo é um gasto, um compromisso, uma tarefa ou um recado.

Nasceu como resposta ao "Meu Assessor" (assistente pago que funciona no
WhatsApp), sem as partes que não interessavam: sem WhatsApp, sem acesso ao
banco, sem conta.

## Os comandos

| Comando | O que faz |
|---|---|
| `prumo` | Mostra o estado e abre o app no navegador do PC |
| `prumo` (mesmo comando) | Também imprime o endereço para abrir **no celular**, se estiver no mesmo wi-fi |
| `prumo parar` | Desliga o servidor local |
| `prumo notas` | Abre as anotações completas do projeto |
| `prumo testar` | Roda a bateria de testes |
| `prumo publicar` | Sobe para o GitHub Pages (conta **pimentel-code**, não a do cartório) |

Para instalar no iPhone: abra o endereço publicado no Safari →
Compartilhar → Adicionar à Tela de Início.

## Decisões já tomadas (não reabrir sem motivo)

| Assunto | Decisão | Por quê |
|---|---|---|
| WhatsApp | **Fora** | Não envolver a Meta, nem arriscar bloqueio de número |
| Acesso ao banco | **Fora** | Não dar extrato bancário a empresa nenhuma |
| Sincronizar com o PC | **Fora, por enquanto** | Não precisa; simplifica muito |
| Formato | **PWA** | Único jeito de instalar no iPhone sem a App Store, e é o mesmo código no Android |
| Tecnologia | HTML/CSS/JS puro, sem framework | Dura anos sem manutenção, e dá para ler o código |
| Onde ficam os dados | **Só no aparelho** (`localStorage`) | Privacidade — em troca, backup é peça central |
| Inteligência | **Regras**, sem IA | Funciona sem internet e sem chave paga |
| Alarme na hora certa | Delegado ao calendário do celular (`.ics`) | O iPhone não deixa PWA agendar aviso; o calendário nativo faz isso muito bem |

## Os arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | A página e a estrutura das telas |
| `estilo.css` | Visual, claro e escuro, margens de iPhone e Android |
| `interpretador.js` | **O coração**: transforma frase solta em registro |
| `dados.js` | Guarda, lê, exporta e importa (`localStorage`) |
| `calendario.js` | Gera o arquivo `.ics` e o link do Google Agenda |
| `app.js` | As quatro telas, a confirmação, os painéis |
| `sw.js` | Faz o app funcionar sem internet |
| `manifest.webmanifest` | Nome, cores e ícones do app instalado |
| `icones/` | Fio de prumo branco em fundo verde-azulado |
| `ANOTACOES.md` | O registro longo: como o interpretador decide, o que falta |

## Onde está a inteligência

Tudo em `interpretador.js`. Ele acha primeiro a **hora**, marca esse pedaço
do texto, e só depois procura valor, data e assunto no que sobrou — é essa
ordem que evita confundir "14h" com "14 reais". Mexer nele sem ler o
`ANOTACOES.md` antes costuma quebrar casos que já funcionavam.

## Estratégia

Fase 1 agora, fase 2 **depois de usar de verdade** — ajustar com base no uso
real, não no palpite.
