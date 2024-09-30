import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path';
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'node:fs';
import { getConfig, localDataPath } from '../lib/dataPath';

const dataPath = localDataPath(process.platform);

if (!fs.existsSync(join(dataPath, 'MDI'))) {
  // New install
  fs.mkdirSync(join(dataPath, 'MDI'));
  fs.mkdirSync(join(dataPath, 'MDI', 'Cohorts'));
  fs.writeFileSync(join(dataPath, 'MDI', 'config.json'), JSON.stringify({
    localUserId: null,
    checkTest: null
  }));
}

let config = getConfig(dataPath);

// let dataSummary = {
//   cohortList: fs.readdirSync(join(dataPath, 'MDI', 'Cohorts'))
// };

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : { icon: join(__dirname, "build", "icon.png") }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // mainWindow.webContents.openDevTools({mode: 'undocked'});

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.loadURL('http://localhost:3000')
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  ipcMain.on('updateConfig', (_, opts) => {
    config = opts.config; // getConfig(dataPath);
    console.log(config);
  });

  // ipcMain.handle('localLogin', (_, { success: string }): { res: boolean } => {
  //   console.log(localPass);
  //   debugger;
  //   return { success: true };
  // });

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  ipcMain.on('ping', () => console.log('pong'))
  createWindow()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
