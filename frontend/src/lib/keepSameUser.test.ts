import { describe, it, expect } from 'vitest'
import { keepSameUser } from './keepSameUser'
import type { User } from '@/lib/supabase'

const u = (id: string) => ({ id }) as User

describe('keepSameUser', () => {
  it('token renovado, mismo usuario → misma referencia', () => {
    const prev = u('a')
    expect(keepSameUser(prev, u('a'))).toBe(prev)
  })
  it('otro usuario → el nuevo', () => {
    const next = u('b')
    expect(keepSameUser(u('a'), next)).toBe(next)
  })
  it('cierre de sesión → null', () => {
    expect(keepSameUser(u('a'), null)).toBeNull()
  })
  it('primer login → el nuevo', () => {
    const next = u('a')
    expect(keepSameUser(null, next)).toBe(next)
  })
})
