import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { draftService } from '@/lib/draftService'
import type { LayoutData } from '@/lib/layoutService'

// Debounce del autosave: ~6s de inactividad, con un flush forzado a los
// 30s aunque el usuario siga editando sin parar.
const DEBOUNCE_MS = 6000
const MAX_WAIT_MS = 30000

export type DraftStatus = 'idle' | 'pending' | 'saved' | 'error'

interface Args {
  // null => hook inactivo. Un layout nunca guardado a mano no tiene fila
  // en public.layouts, así que no puede tener draft (gap conocido).
  layoutId: string | null
  orgId: string
  // Snapshot siempre-actual del contenido persistible. Se lee por ref
  // para que el flush de desmonte/beacon nunca vea un valor stale.
  snapshotRef: React.RefObject<LayoutData>
  // Cambia de identidad SOLO cuando cambia el contenido persistible
  // (elements / drawings / meta / nombre). El viewport queda afuera a
  // propósito: pan/zoom no debe disparar autosave.
  dirtyKey: unknown
  // layoutId != null && el layout ya terminó de cargar && no hay un
  // "Guardar" manual en curso.
  enabled: boolean
}

export function useLayoutAutosave({ layoutId, orgId, snapshotRef, dirtyKey, enabled }: Args) {
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle')

  const layoutIdRef = useRef(layoutId)
  const orgIdRef = useRef(orgId)
  const enabledRef = useRef(enabled)
  layoutIdRef.current = layoutId
  orgIdRef.current = orgId
  enabledRef.current = enabled

  // Token de sesión mantenido al día — el camino beacon lo necesita de
  // forma síncrona (no se puede await getSession() en pagehide).
  const accessTokenRef = useRef<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      accessTokenRef.current = data.session?.access_token ?? null
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      accessTokenRef.current = session?.access_token ?? null
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const debounceTimer = useRef<number | null>(null)
  const maxWaitTimer = useRef<number | null>(null)
  const lastHashRef = useRef<string>('')
  const flushingRef = useRef(false)
  // Salta el primer disparo de dirtyKey después de montar / cambiar de
  // layout: ese cambio viene de aplicar el contenido recién cargado, no
  // de una edición del usuario, y no debe generar un draft.
  const primedRef = useRef(false)

  const hashSnapshot = (s: LayoutData) =>
    JSON.stringify({ e: s.elements, d: s.drawings, m: s.meta })

  const clearTimers = () => {
    if (debounceTimer.current) { window.clearTimeout(debounceTimer.current); debounceTimer.current = null }
    if (maxWaitTimer.current) { window.clearTimeout(maxWaitTimer.current); maxWaitTimer.current = null }
  }

  const flushNormal = useCallback(async () => {
    clearTimers()
    const id = layoutIdRef.current
    const snap = snapshotRef.current
    if (!enabledRef.current || !id || !snap) return
    const hash = hashSnapshot(snap)
    if (hash === lastHashRef.current) { setDraftStatus('saved'); return }
    if (flushingRef.current) return
    flushingRef.current = true
    try {
      await draftService.upsert(id, orgIdRef.current, snap)
      lastHashRef.current = hash
      setDraftStatus('saved')
    } catch {
      setDraftStatus('error')
    } finally {
      flushingRef.current = false
    }
  }, [snapshotRef])

  const flushBeacon = useCallback(() => {
    clearTimers()
    const id = layoutIdRef.current
    const snap = snapshotRef.current
    const token = accessTokenRef.current
    if (!enabledRef.current || !id || !snap || !token) return
    const hash = hashSnapshot(snap)
    if (hash === lastHashRef.current) return
    draftService.upsertBeacon(id, orgIdRef.current, snap, token)
    lastHashRef.current = hash
  }, [snapshotRef])

  // Re-primar y limpiar estado al cambiar el layout que se edita.
  useEffect(() => {
    primedRef.current = false
    lastHashRef.current = ''
    clearTimers()
    setDraftStatus('idle')
  }, [layoutId])

  // Debounce sobre cambios de contenido.
  useEffect(() => {
    if (!enabled || !layoutId) return
    if (!primedRef.current) { primedRef.current = true; return }
    setDraftStatus('pending')
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current)
    debounceTimer.current = window.setTimeout(() => { void flushNormal() }, DEBOUNCE_MS)
    if (!maxWaitTimer.current) {
      maxWaitTimer.current = window.setTimeout(() => { void flushNormal() }, MAX_WAIT_MS)
    }
    // flushNormal es estable; dirtyKey/enabled/layoutId son los disparadores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyKey, enabled, layoutId])

  // Si el autosave se deshabilita (p. ej. "Guardar" manual en curso),
  // cancelar cualquier flush pendiente para no pisar un draft recién borrado.
  useEffect(() => {
    if (!enabled) clearTimers()
  }, [enabled])

  // pagehide / pestaña oculta -> beacon (fetch keepalive).
  useEffect(() => {
    const onPageHide = () => flushBeacon()
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushBeacon() }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [flushBeacon])

  // Desmonte del editor (incluye volver al dashboard vía setView, que no
  // navega el documento): flush normal fire-and-forget. El fetch de
  // supabase-js no se cancela en un desmonte que es solo re-render de React.
  useEffect(() => {
    return () => { void flushNormal() }
  }, [flushNormal])

  // El caller lo invoca tras un "Guardar" manual exitoso: re-sincroniza
  // el hash (para que el próximo autosave no reescriba lo mismo) y corta
  // timers pendientes. El borrado del draft lo hace el caller.
  const markSaved = useCallback((snap: LayoutData) => {
    clearTimers()
    lastHashRef.current = hashSnapshot(snap)
    setDraftStatus('idle')
  }, [])

  return { draftStatus, flushNow: flushNormal, markSaved }
}
