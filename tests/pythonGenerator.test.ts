import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { generatePython } from '../src/lib/pythonGenerator.ts'
test('generated Python script passes the temporary Git repository integration suite', () => {
  const temp = mkdtempSync(join(tmpdir(), 'brush-up-python-'))
  try {
    const script = join(temp, 'contributions.py')
    const future = join(temp, 'future.py')
    writeFileSync(script, generatePython([['2024-02-29', 2], ['2024-03-01', 1]]))
    writeFileSync(future, generatePython([['9999-12-31', 1]]))
    const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
    const result = spawnSync(python, [
      fileURLToPath(new URL('./python.integration.py', import.meta.url)), script, future,
    ], { encoding: 'utf8', timeout: 30_000 })
    assert.ifError(result.error)
    assert.equal(result.status, 0, result.stdout + result.stderr)
    assert.match(result.stderr, /Ran 3 tests/)
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
})
