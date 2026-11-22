/** Fecha local YYYY-MM-DD para nombres de archivo. */
export const localDateStamp = (d = new Date()): string => d.toLocaleDateString('sv-SE')

/** Entrega un archivo de texto: hoja de compartir en iOS si se puede, descarga normal si no. */
export async function saveTextFile(filename: string, text: string, mime = 'application/json'): Promise<void> {
  const file = new File([text], filename, { type: mime })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return // el usuario cerró la hoja
      // cualquier otro fallo: cae a la descarga
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export const formatBytes = (n: number): string =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`
