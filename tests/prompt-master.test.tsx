import { expect, test } from 'claude-code/testing'

const DICA = {
  component: 'PromptHint',
  props: { isDraft: true, isWorking: false, hint: '? for shortcuts' },
} as const

const rotulo = (el: unknown): unknown =>
  (el as { props?: { label?: unknown } } | undefined)?.props?.label

test('a linha de dica mostra os dois botoes em cada superficie que a desenha', async $ => {
  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'prompt-master', surface, ...DICA })

    expect(rotulo(await ui.find({ key: 'pm' }))).toBe('Prompt Master')
    expect(rotulo(await ui.find({ key: 'auto' }))).toBe('auto: desligado')

    await ui.press({ key: 'auto' })
    expect(rotulo(await ui.find({ key: 'auto' }))).toBe('auto: ligado')

    await ui.press({ key: 'auto' })
    expect(rotulo(await ui.find({ key: 'auto' }))).toBe('auto: desligado')

    await ui.unmount()
  }
})
