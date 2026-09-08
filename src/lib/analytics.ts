declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

function isTrackableEnvironment() {
  const host = window.location.hostname
  return host !== 'localhost' && host !== '127.0.0.1'
}

export function trackPageview(path: string) {
  if (typeof window.gtag !== 'function') return
  if (!isTrackableEnvironment()) return

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}
