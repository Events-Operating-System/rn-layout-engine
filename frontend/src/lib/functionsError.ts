import { FunctionsHttpError } from '@supabase/supabase-js'

// FunctionsHttpError.context es la Response cruda del error no-2xx — hay
// que parsear el body para sacar el { error: "..." } real de la función.
export async function resolveFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null)
    if (typeof body?.error === 'string') return body.error
  }
  return fallback
}
