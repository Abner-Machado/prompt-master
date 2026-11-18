export type Estado = 'parado' | 'trabalhando' | 'pronto' | 'falhou'

declare module 'claude-code' {
  interface PluginState {
    'prompt-master': {
      auto: boolean
      estado: Estado
      nota: string
    }
  }
}
