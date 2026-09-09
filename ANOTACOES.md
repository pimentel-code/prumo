# Prumo — anotações do projeto

Última sessão: **7 de setembro de 2026**.

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
~/Prumo/testes/rodar.sh
```

24 frases no interpretador e 14 provas no app inteiro (telas, somas, atraso,
escape de HTML perigoso, ida e volta do backup, aprendizado de categoria).
Rodam com `gjs`, que já vem no Fedora — não há Node instalado nesta máquina.

## O que falta

1. **`gh auth login`** — o único passo que depende dele. Sem isso não dá para
   publicar no GitHub Pages.
2. **Publicar**: criar o repositório `prumo`, subir os arquivos, ligar o Pages,
   e passar o endereço com o passo a passo de instalação no iPhone.
3. **Decidir sobre o botão de microfone dentro do app.** Hoje o ditado é pelo
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
