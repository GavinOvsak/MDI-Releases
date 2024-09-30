// import { ElectronAPI } from '@electron-toolkit/preload'

import { LocalAPI } from '../lib/localTypes'

declare global {
  interface Window {
    // electron: ElectronAPI
    api: unknown,
    local: LocalAPI
  }
}