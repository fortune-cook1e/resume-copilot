import { readdir, readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

// Sum separately compressed modules: a conservative check against the Free 3 MiB limit.
async function compressedSize(directory) {
  let total = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) total += await compressedSize(path)
    else if (!entry.name.endsWith('.map') && entry.name !== 'README.md')
      total += gzipSync(await readFile(path)).byteLength
  }
  return total
}
for (const application of ['api', 'web']) {
  const size = await compressedSize(`apps/${application}/.worker-test`)
  console.log(`${application} Worker: ${(size / 1024).toFixed(0)} KiB compressed`)
  if (size > 3 * 1024 * 1024)
    throw new Error(`${application} exceeds the Workers Free bundle limit`)
}
