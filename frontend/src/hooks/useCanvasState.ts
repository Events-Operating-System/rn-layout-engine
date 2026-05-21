'use client'

import { useState, useCallback } from 'react'
import type { LayoutElement, CanvasViewport } from '@/types/layout'
import { CATEGORY_COLORS } from '@/types/layout'

const INITIAL_ELEMENTS: LayoutElement[] = [
  {
    id: 'el-1',
    name: 'Main Stage',
    category: 'stage',
    x: 10, y: 10,
    width: 20, height: 12,
    rotation: 0,
    color: CATEGORY_COLORS.stage,
    locked: false,
    notes: 'Primary performance stage',
  },
  {
    id: 'el-2',
    name: 'Tent 20x20',
    category: 'structure',
    x: 38, y: 8,
    width: 20, height: 20,
    rotation: 0,
    color: CATEGORY_COLORS.structure,
    locked: false,
    notes: '',
  },
  {
    id: 'el-3',
    name: 'Tent 20x40',
    category: 'structure',
    x: 10, y: 30,
    width: 40, height: 20,
    rotation: 0,
    color: CATEGORY_COLORS.structure,
    locked: false,
    notes: '',
  },
  {
    id: 'el-4',
    name: 'Restroom Block',
    category: 'utility',
    x: 60, y: 8,
    width: 6, height: 3,
    rotation: 0,
    color: CATEGORY_COLORS.utility,
    locked: false,
    notes: '',
  },
  {
    id: 'el-5',
    name: 'Crowd Barrier',
    category: 'barrier',
    x: 10, y: 8,
    width: 20, height: 0.5,
    rotation: 0,
    color: CATEGORY_COLORS.barrier,
    locked: false,
    notes: 'Stage front barrier',
  },
  {
    id: 'el-6',
    name: 'Entrance Gate',
    category: 'circulation',
    x: 25, y: 56,
    width: 8, height: 1,
    rotation: 0,
    color: CATEGORY_COLORS.circulation,
    locked: false,
    notes: '',
  },
]

export function useCanvasState() {
  const [elements, setElements] = useState<LayoutElement[]>(INITIAL_ELEMENTS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 40, y: 40, scale: 1 })

  const selectElement = useCallback((id: string | null) => {
    setSelectedId(id)
  }, [])

  const updateElement = useCallback((id: string, updates: Partial<LayoutElement>) => {
    setElements(prev =>
      prev.map(el => (el.id === id ? { ...el, ...updates } : el))
    )
  }, [])

  const updateViewport = useCallback((updates: Partial<CanvasViewport>) => {
    setViewport(prev => ({ ...prev, ...updates }))
  }, [])

  const selectedElement = elements.find(el => el.id === selectedId) ?? null

  return {
    elements,
    selectedId,
    selectedElement,
    viewport,
    selectElement,
    updateElement,
    updateViewport,
  }
}
