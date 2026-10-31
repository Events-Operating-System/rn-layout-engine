import type { User } from '@/lib/supabase'

// Al renovarse el token (p. ej. al volver a la pestaña) Supabase emite
// SIGNED_IN / TOKEN_REFRESHED con un objeto user nuevo. Si es el mismo
// usuario se conserva la referencia: así nada que dependa de `user` se
// recarga ni desmonta el editor (cambios sin guardar, zoom, selección).
export function keepSameUser(prev: User | null, next: User | null): User | null {
  return prev && next && prev.id === next.id ? prev : next
}
