import fs from 'fs/promises'
import path from 'path'

export async function atomicWrite(filePath: string, data: string): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  const tmp = filePath + '.tmp'
  await fs.writeFile(tmp, data, 'utf-8')
  await fs.rename(tmp, filePath)
}
