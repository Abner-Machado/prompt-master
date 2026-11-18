import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Estado } from '../types'

const auto = atom({ plugin: 'prompt-master', key: 'auto' } as const, false)
const estado = atom({ plugin: 'prompt-master', key: 'estado' } as const, 'parado' as Estado)
const nota = atom({ plugin: 'prompt-master', key: 'nota' } as const, '')

const COMBO = 'C:\\Users\\abner\\Tools\\combo\\combo.ps1'
const MINIMO = 12

const instrucao = (texto: string) =>
  [
    'Você reescreve pedidos para um agente de programação. Devolva SÓ o pedido reescrito,',
    'nada de comentário, introdução ou explicação sobre o que mudou.',
    '',
    'Regras:',
    '- Mesma língua do original (português do Brasil, se foi em português).',
    '- Preserve a intenção e todo detalhe concreto: caminho, nome de arquivo, número, erro, comando.',
    '- Não invente requisito, tecnologia, restrição nem escopo que o original não tem.',
    '- Deixe explícito o que está implícito: o que entregar, onde, e como saber que ficou pronto.',
    '- Se o original for ambíguo num ponto que muda o trabalho, termine com uma linha',
    '  "Em dúvida: <a pergunta>" em vez de escolher por conta.',
    '- Sem markdown decorativo, sem emoji, sem elogio.',
    '- Curto. Se o original já estava bom, devolva quase igual.',
    '',
    'Pedido original:',
    texto,
  ].join('\n')

/** Tira o cabeçalho do oc.ps1 e a linha de ficha da resposta da frota. */
function limparSaidaDaFrota(saida: string): string {
  const linhas = saida.split(/\r?\n/)
  const marcador = linhas.findIndex(l => /^=== OK modelo:/.test(l))
  const corpo = marcador >= 0 ? linhas.slice(marcador + 1) : linhas
  return corpo
    .filter(l => !/^\[combo/.test(l) && !/^ficha ->/.test(l) && !/^=== /.test(l))
    .join('\n')
    .trim()
}

type Resultado = { ok: true; texto: string; motor: string } | { ok: false; motivo: string }

async function reescrever($: EngineInterface, texto: string): Promise<Resultado> {
  const pedido = instrucao(texto)

  // 1. Haiku pelo cliente da própria sessão. Funciona em qualquer superfície,
  //    celular incluído, porque não depende de nada no disco.
  try {
    const r = await $.model.complete({ model: 'haiku', prompt: pedido, maxTokens: 900 })
    if (r.isAnswered && r.text && r.text.trim()) {
      return { ok: true, texto: r.text.trim(), motor: 'haiku' }
    }
  } catch {
    // cai para a frota
  }

  // 2. Frota free (R$0) pelo combo.ps1, só onde o script existe: a máquina do Abner.
  //    No celular e em sessão hospedada esse caminho nem é tentado.
  try {
    if (!(await $.fs.exists(COMBO))) {
      return { ok: false, motivo: 'haiku não respondeu e a frota não existe aqui' }
    }
    const r = await $.process.run(
      ['pwsh', '-NoProfile', '-File', COMBO, 'volume', '-Prompt', pedido, '-TimeoutSec', '90'],
      { timeoutMs: 150000 },
    )
    const limpo = limparSaidaDaFrota(r.stdout ?? '')
    if (r.exitCode === 0 && limpo) {
      return { ok: true, texto: limpo, motor: 'frota free' }
    }
    return { ok: false, motivo: `frota saiu com exit ${r.exitCode}` }
  } catch (erro) {
    return { ok: false, motivo: String(erro).slice(0, 120) }
  }
}

function vaiReescrever(e: { text: string; command?: unknown; isMeta?: true }): boolean {
  if (e.command || e.isMeta) return false
  const t = e.text.trim()
  if (t.length < MINIMO) return false
  if (t.startsWith('/') || t.startsWith('!') || t.startsWith('#')) return false
  return true
}

export const register: Register = on => {
  // Com o auto ligado, reescreve na hora de enviar. Falha não bloqueia: vai o original.
  on('prompt.submit', async ($, e, next) => {
    if (!(await read($, auto)) || !vaiReescrever(e)) return next(e)

    await update($, estado, () => 'trabalhando')
    const r = await reescrever($, e.text)

    if (!r.ok) {
      await update($, estado, () => 'falhou')
      await update($, nota, () => r.motivo)
      $.ui.toast('Prompt Master falhou, enviando o original')
      return next(e)
    }

    await update($, estado, () => 'pronto')
    await update($, nota, () => `reescrito por ${r.motor}`)
    $.ui.toast(`Prompt reescrito por ${r.motor}`)
    return next({ ...e, text: r.texto })
  })

  // Botões na linha de dica, logo ABAIXO da caixa do prompt. Desenhada no terminal,
  // no app desktop e no celular. O texto que o engine põe ali continua na mesma linha.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const ligado = await read($, auto)
    const st = await read($, estado)
    const obs = await read($, nota)

    const reescreverCaixa = async () => {
      const { text } = await $.prompt.read()
      const texto = text.trim()
      if (texto.length < MINIMO) {
        $.ui.toast('Escreva o pedido primeiro')
        return
      }
      await update($, estado, () => 'trabalhando')
      $.ui.toast('Prompt Master trabalhando...')
      const r = await reescrever($, texto)
      if (!r.ok) {
        await update($, estado, () => 'falhou')
        await update($, nota, () => r.motivo)
        $.ui.toast(`Prompt Master falhou: ${r.motivo}`)
        return
      }
      await $.prompt.fill({ text: r.texto, mode: 'replace' })
      await update($, estado, () => 'pronto')
      await update($, nota, () => `reescrito por ${r.motor}`)
    }

    // Site compartilhado: a linha que o engine e os outros mods desenhariam ali
    // entra na própria árvore, senão ela desaparece.
    const abaixo = await next(e)

    return (
      <Box>
        <Button key="pm" label="Prompt Master" onPress={reescreverCaixa} />
        <Text> </Text>
        <Button
          key="auto"
          label={ligado ? 'auto: ligado' : 'auto: desligado'}
          onPress={() => update($, auto, v => !v)}
        />
        {st === 'trabalhando' ? <Text dimColor> reescrevendo...</Text> : null}
        {st !== 'trabalhando' && obs ? <Text dimColor> {obs}</Text> : null}
        <Text> </Text>
        {abaixo}
      </Box>
    )
  })
}
