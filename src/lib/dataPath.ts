import { join } from 'node:path'
import fs from 'node:fs'
import { CohortSummaryState, LocalAccountState } from './localTypes'
const { promisify } = require('util')
const fastFolderSize = require('fast-folder-size')

export type ConfigType = {
  initVector: string
  checkTest: string | null
} & Omit<LocalAccountState, 'isLoggedIn'>

export function localDataPath(platform: NodeJS.Platform): string {
  let basePath: string = ''
  if (platform == 'win32') {
    if (process.env.APPDATA == null) throw new Error('Missing path')
    basePath = process.env.APPDATA
  } else if (platform == 'darwin') {
    if (process.env.HOME == null) throw new Error('Missing path')
    basePath = join(process.env.HOME, 'Library', 'Application Support')
  } else if (platform == 'linux') {
    if (process.env.HOME == null) throw new Error('Missing path')
    basePath = process.env.HOME
  } else {
    throw new Error('Platform not recognized')
  }

  if (!fs.existsSync(join(basePath, 'MDI'))) {
    fs.mkdirSync(join(basePath, 'MDI'))
  }

  if (!fs.existsSync(join(basePath, 'MDI', 'Projects'))) {
    fs.mkdirSync(join(basePath, 'MDI', 'Projects'))
  }

  if (!fs.existsSync(join(basePath, 'MDI', 'config.json'))) {
    fs.writeFileSync(
      join(basePath, 'MDI', 'config.json'),
      JSON.stringify({
        initVector: Buffer.alloc(16, 0).toString('base64')
      })
    )
  }

  return join(basePath, 'MDI')
}

export function getConfig(dataPath: string): ConfigType {
  // try {
  return JSON.parse(fs.readFileSync(join(dataPath, 'config.json'), 'utf8')) as ConfigType
  // } catch(e) {
  //   console.log(e);
  // }
}

export function setConfig(dataPath: string, config: ConfigType): void {
  fs.writeFileSync(join(dataPath, 'config.json'), JSON.stringify(config))
}

export async function getCohortSummary(
  basePath: string,
  projectId: string
): Promise<CohortSummaryState> {
  if (!fs.existsSync(join(basePath, 'MDI', 'Projects'))) {
    fs.mkdirSync(join(basePath, 'MDI', 'Projects'))
  }

  const summary: CohortSummaryState = {
    'cohort-1': {
      name: 'Cohort 1',
      num: 10030,
      date: new Date('3/3/2020'),
      datasets: {
        'dataset-1': {
          name: 'Dataset 1',
          size: 10000000,
          date: new Date('3/6/2020')
        }
      }
    }
  }

  const projectPath = join(basePath, 'MDI', 'Projects', projectId)
  if (!fs.existsSync(projectPath)) fs.mkdirSync(projectPath);

  if (!fs.existsSync(join(projectPath, 'Cohorts'))) {
    fs.mkdirSync(join(projectPath, 'Cohorts'))
  }

  const fastFolderSizeAsync = promisify(fastFolderSize)

  const cohortList = fs.readdirSync(join(projectPath, 'Cohorts'))
  for (const cohortId of cohortList) {
    const cohortPath = join(projectPath, 'Cohorts', cohortId)
    const cohortInfo = JSON.parse(fs.readFileSync(join(cohortPath, 'cohort.json'), 'utf8')) as {
      name: string,
      num: number
      date: Date
    }
    summary[cohortId] = {
      ...cohortInfo,
      datasets: {}
    }

    if (!fs.existsSync(join(cohortPath, 'Datasets'))) {
      fs.mkdirSync(join(cohortPath, 'Datasets'))
    }
    const datasetList = fs.readdirSync(join(cohortPath, 'Datasets'))
    for (const datasetId of datasetList) {
      const datasetPath = join(cohortPath, 'Datasets', datasetId)
      const datasetInfo = JSON.parse(
        fs.readFileSync(join(datasetPath, 'dataset.json'), 'utf8')
      ) as {
        name: string,
        date: Date
      }
      summary[cohortId].datasets[datasetId] = {
        ...datasetInfo,
        size: await fastFolderSizeAsync('.')
      }
    }
  }

  return summary
}
