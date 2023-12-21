// main.js
const {app, BrowserWindow, Menu} = require('electron');
const {autoUpdater} = require("electron-updater");
const log = require('electron-log');
const path = require('path');

//-------------------------------------------------------------------
// Logging
//
// This logging setup is not required for auto-updates to work,
// but it sure makes debugging easier :)
//-------------------------------------------------------------------
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,  // Set an initial width (you can adjust this as needed)
        height: 600, // Set an initial height (you can adjust this as needed)
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Get the path to the app's resources folder
    const appPath = app.getAppPath();
    
    mainWindow.loadFile(path.join(appPath, 'app/render', 'floor.html'));
    
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
    
    // Fullscreen the window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize(); // Maximize the window
        //mainWindow.setFullScreen(true); // Set it to fullscreen
    });
}

app.whenReady().then(() => {
    // Create the Menu
    const menu = Menu.buildFromTemplate([]);
    Menu.setApplicationMenu(menu);

    createWindow();
  
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', function () {
    app.quit();
});

app.on('ready', function()  {
    autoUpdater.checkForUpdatesAndNotify();
});