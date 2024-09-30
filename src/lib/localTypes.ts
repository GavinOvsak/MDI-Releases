/* eslint-disable no-unused-vars */
export type LocalAccountState = {
  localUserId: string | null
  isLoggedIn: boolean
  cohort?: string
  dataset?: string
}

export type CohortSummaryState = {
  [key: string]: {
    name: string
    num: number
    date: Date
    datasets: { [key: string]: { name: string; size: number; date: Date } }
  }
}

export type LocalAPI = {
  getLocalAccount: () => LocalAccountState
  setLocalAccount: ({ userId, localPass }: { userId: string; localPass: string }) => void
  clearLocalData: () => void
  localLogin: (localPass: string) => Promise<boolean>
  logout: () => void
  getCohortSummary: (projectId: string) => Promise<CohortSummaryState>
  selectDataset: (cohort: string, dataset?: string) => void
}
