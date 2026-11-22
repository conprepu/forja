/**
 * Entrega un archivo al usuario. En iPhone usa la hoja de compartir
 * (Guardar en Archivos, AirDrop…); si no está disponible, lo descarga.
 * Devuelve false si el usuario canceló.
 */
export async function shareOrDownload(fileName: string, content: string, type = 'application/json'): Promise<boolean> {
  const file = new File([content], fileName, { type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      // Otros errores (p. ej. sin gesto del usuario): seguir con la descarga.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
