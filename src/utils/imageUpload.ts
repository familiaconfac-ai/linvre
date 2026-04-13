export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Falha ao ler imagem selecionada.'))
    reader.readAsDataURL(file)
  })
}

export async function uploadImage(file: File): Promise<string> {
  // Placeholder para futura integração com Firebase Storage.
  return fileToDataUrl(file)
}
