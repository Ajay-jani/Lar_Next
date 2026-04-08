export const PDF_FILE_ACCEPT = '.pdf,application/pdf'

export function isPdfFile(file: Pick<File, 'type' | 'name'>): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
