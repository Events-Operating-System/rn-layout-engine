// supabase-js network calls have no internal timeout: if the underlying
// fetch stalls, the promise never settles. Bit this repo once already
// (2026-07-08, getSession()) and again right after (checkOrgMembership()'s
// getUser() + org_members query) — any new auth-adjacent async chain
// (session bootstrap, org status fetch) must be wrapped in this.
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => { window.clearTimeout(timeoutId); resolve(value) },
      (err) => { window.clearTimeout(timeoutId); reject(err) },
    )
  })
}
