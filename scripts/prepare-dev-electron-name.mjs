import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const appName = 'AZrev'
const bundleIdentifier = 'com.azrev.dev'
const electronPackagePath = path.resolve('node_modules/electron')
const electronDistPath = path.join(electronPackagePath, 'dist')
const sourceAppPath = path.join(electronDistPath, 'Electron.app')
const devAppPath = path.join(electronDistPath, `${appName}.app`)
const sourceExecutablePath = path.join(devAppPath, 'Contents/MacOS/Electron')
const devExecutablePath = path.join(devAppPath, `Contents/MacOS/${appName}`)
const infoPlistPath = path.join(devAppPath, 'Contents/Info.plist')
const pathFilePath = path.join(electronPackagePath, 'path.txt')
const plistBuddyPath = '/usr/libexec/PlistBuddy'

if (process.platform !== 'darwin' || !fs.existsSync(sourceAppPath)) {
  process.exit(0)
}

fs.rmSync(devAppPath, { force: true, recursive: true })
fs.cpSync(sourceAppPath, devAppPath, { recursive: true })
fs.renameSync(sourceExecutablePath, devExecutablePath)

function setPlistValue(key, value) {
  execFileSync(plistBuddyPath, ['-c', `Set :${key} ${value}`, infoPlistPath], {
    stdio: 'ignore',
  })
}

setPlistValue('CFBundleName', appName)
setPlistValue('CFBundleDisplayName', appName)
setPlistValue('CFBundleIdentifier', bundleIdentifier)
setPlistValue('CFBundleExecutable', appName)

fs.writeFileSync(pathFilePath, `${appName}.app/Contents/MacOS/${appName}`, 'utf-8')
fs.utimesSync(devAppPath, new Date(), new Date())
