#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]
if (!version) {
  console.error('Usage: sync-app-version.mjs <version>')
  process.exit(1)
}

const path = new URL('../app.json', import.meta.url)
const config = JSON.parse(readFileSync(path, 'utf8'))
config.expo.version = version
writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`)
console.log(`Synced app.json version to ${version}`)
