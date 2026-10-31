// Indicadores sobre el canvas (DOM, no Konva): posición del cursor, zoom +
// "Ajustar a pantalla", lectura de largo/ángulo al dibujar y resultado de Medir.

// Lectura de largo/ángulo junto al cursor al dibujar una línea/flecha;
// screenX/Y son relativos al contenedor.
export interface DrawingReadout {
  screenX: number; screenY: number; lengthM: number; angleDeg: number; snapped: boolean
}

export type MeasurementResult =
  | { type: 'distance'; lengthM: number; angleDeg: number; screenX: number; screenY: number }
  | { type: 'area'; areaM2: number; elementName: string; screenX: number; screenY: number }

interface Props {
  cursorPos: { x: number; y: number } | null
  scale: number
  fitLabel: string
  onFitToScreen: () => void
  drawingReadout: DrawingReadout | null
  measurement: MeasurementResult | null
}

export default function CanvasHud({ cursorPos, scale, fitLabel, onFitToScreen, drawingReadout, measurement }: Props) {
  return (
    <>
      {/* Cursor HUD */}
      {cursorPos && (
        <div className="absolute bottom-3 left-3 font-mono text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 pointer-events-none">
          {cursorPos.x}m, {cursorPos.y}m
        </div>
      )}

      {/* Zoom HUD + Ajustar a pantalla (Shift+1) */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <button
          type="button"
          onClick={onFitToScreen}
          title={`${fitLabel} (Shift+1)`}
          aria-label={fitLabel}
          className="font-mono text-[10px] text-slate-300 bg-slate-900/80 hover:bg-slate-800 px-2 py-1 rounded border border-slate-700/50 transition-colors"
        >
          ⤢ {fitLabel}
        </button>
        <div className="font-mono text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 pointer-events-none">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Live length/angle readout while drawing a line/arrow */}
      {drawingReadout && (
        <div
          className={`absolute font-mono text-[10px] px-2 py-1 rounded border pointer-events-none whitespace-nowrap ${
            drawingReadout.snapped
              ? 'text-amber-300 bg-amber-950/80 border-amber-700/60'
              : 'text-slate-300 bg-slate-900/80 border-slate-700/50'
          }`}
          style={{ left: drawingReadout.screenX + 14, top: drawingReadout.screenY + 14 }}
        >
          {drawingReadout.lengthM.toFixed(2)}m · {Math.round(drawingReadout.angleDeg)}°
        </div>
      )}

      {/* Measurement result — persists until the tool changes or another
          click replaces it; never written to elements/drawings, so it
          never pollutes the saved layout */}
      {measurement && (
        <div
          className="absolute font-mono text-[10px] px-2 py-1 rounded border pointer-events-none whitespace-nowrap text-cyan-300 bg-cyan-950/80 border-cyan-700/60"
          style={{ left: measurement.screenX + 14, top: measurement.screenY + 14 }}
        >
          {measurement.type === 'distance'
            ? `${measurement.lengthM.toFixed(2)}m · ${Math.round(measurement.angleDeg)}°`
            : `${measurement.elementName}: ${measurement.areaM2.toFixed(2)} m²`}
        </div>
      )}
    </>
  )
}
