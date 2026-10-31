// Formato de las medidas de muros y cotas, con los decimales de la org.
export function formatMeters(meters: number, decimals: number): string {
  return `${meters.toFixed(Math.max(0, Math.min(4, decimals)))} m`
}
