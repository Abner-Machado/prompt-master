# prompt-master

Mod de Claude Code que reescreve o seu pedido antes de ele sair. Dois botões ficam na linha
de dica, logo abaixo da caixa do prompt, a mesma linha do `? for shortcuts`.

- `Prompt Master` pega o que está escrito na caixa, reescreve e devolve na caixa. Você lê
  antes de enviar.
- `auto`, quando ligado, faz a reescrita no envio, e o pedido já sai reescrito.

Desligado por padrão. Nada é alterado sem você clicar.

## Por que

Pedido mal escrito custa mais caro que pedido demorado. O agente chuta, você corrige, ele
chuta de novo, e três turnos se foram por causa de uma frase. Esse mod enfia um passo de
reescrita no meio, com uma instrução que proíbe inventar requisito: preserva caminho, número,
erro e nome de arquivo, e deixa explícito o que entregar e como saber que ficou pronto.

Quando o pedido é ambíguo num ponto que mudaria o trabalho, a reescrita termina com uma linha
`Em dúvida: <a pergunta>` em vez de escolher sozinha. Isso é de propósito. Chute silencioso é
pior que pergunta.

## Instalar

No prompt de uma sessão de terminal:

```
/plugin install prompt-master --marketplace Abner-Machado/prompt-master
```

Responda `y` para adicionar o marketplace e escolha o escopo (o de usuário é o primeiro).

De um shell:

```
claude plugin install prompt-master --marketplace Abner-Machado/prompt-master
```

No app desktop, onde `/plugin` não roda: clique no `+` ao lado da caixa do prompt, depois
Plugins, Add marketplace com `Abner-Machado/prompt-master`, depois Add plugin.

## O que não é reescrito

Comando de barra, linha começando com `!` ou `#`, pedido com menos de 12 caracteres e os
prompts que o próprio sistema injeta. Falha de reescrita não bloqueia nada: o original é
enviado inteiro e aparece um toast dizendo que falhou.

## Motor

Primeiro `haiku`, pelo cliente da própria sessão. Funciona em qualquer superfície que desenhe
a linha de dica: terminal, app desktop e celular.

Se o haiku não responder, o mod tenta uma frota local de modelos gratuitos por um script
chamado `combo.ps1`. Esse caminho só é tentado onde o script existe, então em máquina de
outra pessoa ele nem é alcançado: sobra o haiku, que é o caminho normal.

## Onde aparece

A linha de dica é desenhada no terminal, no app desktop e no celular. Na extensão do VS Code
não, porque ali o slot não existe.

## Licença

MIT.
