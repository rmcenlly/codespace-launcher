'use strict'
require('dotenv').config()
const path = require('path')
const { execSync } = require('child_process')
const { build, Platform } = require('electron-builder')
const { build: config } = require('../package.json')

// Prevent electron-builder from auto-discovering Windows cert store certificates.
// Must be set in the same process before build() is called.
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'

execSync('electron-vite build', { stdio: 'inherit', shell: true })

const isPublish = process.env.PUBLISH === '1'

const buildConfig = {
  targets: Platform.WINDOWS.createTarget(null, require('electron-builder').Arch.x64),
  publish: isPublish ? 'always' : 'never',
  config: {
    ...config,
    publish: {
      provider: 'github',
      owner: 'rmcenlly',
      repo: 'codespace-launcher',
      releaseType: 'release'
    },
    win: {
      ...config.win,
      signAndEditExecutable: false
    },
    afterPack: async (context) => {
      const rcedit = require('rcedit')
      const { copyFileSync } = require('fs')
      const exePath = path.join(context.appOutDir, 'Codespace Launcher.exe')
      const iconPath = path.join(__dirname, '..', 'build', 'icon.ico')
      await rcedit(exePath, { icon: iconPath })
      // Copy icon into resources after rcedit has finished with it,
      // so the tray can load it at runtime via process.resourcesPath
      copyFileSync(iconPath, path.join(context.appOutDir, 'resources', 'icon.ico'))
    }
  }
}

async function run(attemptsLeft) {
  try {
    await build(buildConfig)
  } catch (e) {
    if (e.code === 'EBUSY' && attemptsLeft > 1) {
      console.warn(`EBUSY on ${e.path} — retrying in 3s... (${attemptsLeft - 1} attempts left)`)
      await new Promise((r) => setTimeout(r, 3000))
      await run(attemptsLeft - 1)
    } else {
      console.error(e)
      process.exit(1)
    }
  }
}

run(5)
