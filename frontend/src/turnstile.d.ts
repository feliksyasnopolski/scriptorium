interface TurnstileOptions {
  sitekey: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
}

interface Turnstile {
  render: (container: HTMLElement, options: TurnstileOptions) => string
  remove: (widgetId: string) => void
  reset: (widgetId: string) => void
}

interface Window { turnstile?: Turnstile }
