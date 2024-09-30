import { contextBridge, ipcRenderer } from 'electron'
import { LocalAPI } from '../lib/localTypes'
import { getCohortSummary, getConfig, localDataPath, setConfig } from '../lib/dataPath'
import { join } from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
const algorithm = 'aes-256-cbc'

const dataPath = localDataPath(process.platform)
let config = getConfig(dataPath)

const decryptionTest = 'MDI'
let decryptionPass: string | null = null

if (process.contextIsolated) {
  try {
    const localAPI: LocalAPI = {
      getLocalAccount: () => {
        return { localUserId: config.localUserId, isLoggedIn: decryptionPass != null }
      },
      setLocalAccount: ({ userId, localPass }: { userId: string; localPass: string }) => {
        const key = crypto.scryptSync(localPass, 'MDI', 32)
        decryptionPass = localPass
        const cipher = crypto.createCipheriv(
          algorithm,
          key,
          Buffer.from(config.initVector, 'base64')
        )
        const checkTest = Buffer.concat([cipher.update(decryptionTest), cipher.final()]).toString(
          'base64'
        )

        config = {
          localUserId: userId,
          checkTest,
          initVector: config.initVector
        }

        setConfig(dataPath, config)
        ipcRenderer.send('updateConfig', { config })
      },
      clearLocalData: () => {
        fs.rmdirSync(join(dataPath, 'Projects'))
        fs.mkdirSync(join(dataPath, 'Projects'))
        config = {
          localUserId: null,
          checkTest: null,
          initVector: config.initVector
        }
        setConfig(dataPath, config)
        ipcRenderer.send('updateConfig', { config })
      },
      localLogin: async (localPass: string): Promise<boolean> => {
        if (config.checkTest == null) throw new Error('missing check test')

        const key = crypto.scryptSync(localPass, 'MDI', 32)
        const decipher = crypto.createDecipheriv(
          algorithm,
          key,
          Buffer.from(config.initVector, 'base64')
        )
        const decryptedData: string =
          decipher.update(config.checkTest, 'base64') + decipher.final('utf8')

        const success = decryptedData == decryptionTest
        decryptionPass = success ? localPass : null

        console.log(decryptedData)
        return success
      },
      logout: () => {
        decryptionPass = null;
      },
      getCohortSummary: async (projectId: string) => {
        return await getCohortSummary(dataPath, projectId);
      },
      selectDataset: (cohort: string, dataset?: string) => {
        config = {
          ...config, cohort, dataset
        };
        setConfig(dataPath, config)
        ipcRenderer.send('updateConfig', { config })
      }
    }
    contextBridge.exposeInMainWorld('local', localAPI)
  } catch (error) {
    console.error(error)
  }
}
