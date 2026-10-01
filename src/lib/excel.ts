/**
 * Exportar a .xlsx en el navegador (patrón de FQSD `lib/excel.ts`). SheetJS se carga solo al exportar,
 * para no pesar en la carga inicial. Recibe filas + columnas; no sabe nada del proyecto.
 */
export interface Columna<T> { titulo: string; valor: (fila: T) => string | number | null | undefined }

export interface Hoja<T> { nombre: string; filas: T[]; columnas: Columna<T>[] }
/** Ayuda de tipos: cada hoja con su propio tipo de fila. */
export const hoja = <T,>(h: Hoja<T>) => h as unknown as Hoja<unknown>;

export async function descargarXlsx(archivo: string, hojas: Hoja<unknown>[]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const h of hojas) {
    const aoa = [h.columnas.map(c => c.titulo), ...h.filas.map(f => h.columnas.map(c => c.valor(f) ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = h.columnas.map(c => ({ wch: Math.min(60, Math.max(c.titulo.length, ...h.filas.map(f => String(c.valor(f) ?? '').length)) + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, h.nombre.slice(0, 31));
  }
  XLSX.writeFile(wb, archivo);
}
