const $ = require('jquery');
const Tabulator = require('tabulator-tables');
var Datastore = require('nedb');
var playersDB = new Datastore({ filename: 'C:/HIDEAWAY-NEVERDELETE/database-tables/players.db', autoload: true});
var activePlayersDB = new Datastore({ filename: 'C:/HIDEAWAY-NEVERDELETE/database-tables/activeplayers.db', autoload: true});
var activityToday = getTodayOrYesterday();
var ActivityLog;

var table;

$(function() {
    activePlayersDB.find({}, (err, records) => {
        if (err) {
            console.error("Error Grabbing Players: " + err);
        } else {
            if (records && records.length) {
                // Run initial sit money left calculation
                for (var i=0; i < records.length; i++) {
                    var record = records[i];
                    record = recalculateSitMoneyLeft(record);
                }

                table = new Tabulator("#activePlayersTable", {
                    data:records,
                    layout:"fitColumns",
                    initialSort:[
                        {column:"firstName", dir:"asc"},
                    ],
                    index:"playerID",
                    columns:[
                        {title:"PlayerID", field:"playerID", width:200},
                        {title:"First Name", field:"firstName"},
                        {title:"Last Name", field:"lastName"},
                        {title:"Clocked In", field:"startTimeStamp", formatter:timeStamp},
                        {title:"Sit $ Started", field:"sitMoneyStarted"},
                        {title:"Sit $ Added", field:"sitMoneyAdded"},
                        {title:"Sit $ Used", field:"sitMoneyUsed"},
                        {title:"Sit $ Left", field:"sitMoneyLeft", formatter:alertSitMoney},
                        {title:"Clock Out", field:"clockOut", formatter:clockOut},
                    ],
                });

                ActivityLog = new Datastore({ filename: 'C:/HIDEAWAY-NEVERDELETE/logs/ActivityLog-' + activityToday + '.db', autoload: true});
            }
        }
    });

    function timeStamp(cell) {
        // Format options
        const options = {
            weekday: 'short',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        };

        var value = cell.getValue();
        var displayValue = value.toLocaleString('en-US', options);
        return displayValue;
    }

    function alertSitMoney(cell) {
        var value = cell.getValue();
        if (value <= 12) {
            cell.getElement().classList.add('alert-num');
        } else {
            cell.getElement().classList.remove('alert-num');
        }
        return value;
    }

    function clockOut(cell) {
        const playerID = cell.getRow().getData().playerID;
        const displayValue = `
            <div id="clockout-container">
                <form id="playerID-${playerID}" onsubmit="clockOutSubmit('${playerID}'); return false;">
                    <input type="submit" id="clockout-submit" class="btn btn-primary" value="Clock Out"/>
                </form>
            </div>
            `;
        return displayValue;
    }

    setInterval(reRenderFloorDisplayActive, 60000); // update active players table every 60 seconds
});

function clockOutSubmit (playerID) {
    // Update the active player table
    activePlayersDB.findOne({ playerID: playerID }, (err, activityRecord) => {
        if (err) {
            console.error("Error Finding Player Record to Update - 200: " + err);
        } else {
            if (activityRecord) {
                activityRecord = recalculateSitMoneyLeft(activityRecord);
                var sitMoneyLeft = activityRecord.sitMoneyLeft;

                // Gather ActivityLog record
                const activityLogRecord = {
                    "playerID": playerID,
                    "firstName": activityRecord.firstName,
                    "lastName": activityRecord.lastName,
                    "startTimeStamp": activityRecord.startTimeStamp,
                    "endTimeStamp": new Date(),
                    "sitMoneyStarted": activityRecord.sitMoneyStarted,
                    "sitMoneyAdded": activityRecord.sitMoneyAdded,
                    "sitMoneyUsed": activityRecord.sitMoneyUsed,
                    "sitMoneyLeft": activityRecord.sitMoneyLeft
                };
        
                // Remove the record in the activePlayers database
                activePlayersDB.remove({ playerID: playerID }, {}, (updateErr, numReplaced) => {
                    if (updateErr) {
                        console.error("Error Actually Updating the Record: " + updateErr);
                    }
                });
                activePlayersDB.persistence.compactDatafile();
                
                var foundRow = table.searchRows("playerID", "=", playerID);
                if (foundRow.length == 1) {
                    foundRow[0].delete();
                }

                // Update the record in the palyers database
                playersDB.findOne({ playerID: playerID }, (ferr, playersRecord) => {
                    if (ferr) {
                        console.error("Error Finding Player Record to Update - 201: " + ferr);
                    } else {
                        if (playersRecord) {
                            playersRecord.sitMoneyBought = sitMoneyLeft;
                            playersRecord.playing = 0;

                            playersDB.update({ playerID: playerID }, playersRecord, {}, (updateErrz, numReplaced) => {
                                if (updateErrz) {
                                    console.error("Error Actually Updating the Players Record: " + updateErrz);
                                }
                            });

                            playersDB.persistence.compactDatafile();
                        }
                    }
                });

                // Insert into Activiy Log file
                ActivityLog.insert(activityLogRecord, (err, docs) => {
                    if (err) console.log('ActivityLog Error: ', err);
                });
            } else {
                console.error("No Record Found! - 100");
            }
        }
    });
}

// IMPORTANT CALCULATION FOR DISPLAY ONLY
function recalculateSitMoneyLeft (record) {
    var startTimeStamp = new Date(record.startTimeStamp);
    const currentTimeStamp = new Date();
    const timeDifference = currentTimeStamp - startTimeStamp;
    const minutesPassed = Math.floor(timeDifference / 60000);
    const sitMoneyUsed = Math.floor(minutesPassed / 12);

    // Reduce $1 every 12 minutes passed
    record.sitMoneyUsed = sitMoneyUsed;
    record.sitMoneyLeft = record.sitMoneyStarted + record.sitMoneyAdded - sitMoneyUsed;

    return record;
}

function reRenderFloorDisplayActive () {
    activePlayersDB.find({}, (err, records) => {
        if (err) {
            console.error("Error Grabbing Players: " + err);
        } else {
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                record = recalculateSitMoneyLeft(record);
                table.updateData([{playerID:record.playerID, sitMoneyLeft:record.sitMoneyLeft, sitMoneyUsed:record.sitMoneyUsed}]);
            }
        }
    });
}

function getTodayOrYesterday() {
    const now = new Date();
    const currentHour = now.getHours();
  
    // Check if the current time is after noon (12:00:00)
    if (currentHour >= 12) {
        // After noon, return today's date
        return formatDate(now);
    } else {
        // Before noon, return yesterday's date
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return formatDate(yesterday);
    }
}
  
// Format the date as "YYYY-MM-DD"
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
  