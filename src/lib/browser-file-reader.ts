export function readFileAsArrayBufferWithProgress(
  file: File,
  onProgress?: (_progress: number) => void
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onprogress = event => {
      if (!event.lengthComputable || !onProgress) {
        return
      }

      onProgress(Math.round((event.loaded / event.total) * 100))
    }

    reader.onerror = () => {
      reject(reader.error ?? new Error(`Unable to read "${file.name}".`))
    }

    reader.onload = () => {
      resolve(reader.result as ArrayBuffer)
    }

    reader.readAsArrayBuffer(file)
  })
}
