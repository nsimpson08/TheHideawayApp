// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const {autoUpdater} = require("electron-github-autoupdater");

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

//-------------------------------------------------------------------
// Auto updates - Option 1 - Simplest version
//
// This will immediately download an update, then install when the
// app quits.
//-------------------------------------------------------------------
app.on('ready', function()  {
    autoUpdater({
        baseUrl: 'https://github.com/nsimpson08/TheHideawayApp.git',
        owner: 'nsimpson08',
        repo: 'TheHideawayApp',
        accessToken: "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"
    });
});
