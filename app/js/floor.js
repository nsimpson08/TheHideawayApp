const $ = require('jquery');
const fs = require('fs');
const Tabulator = require('tabulator-tables');
var Datastore = require('nedb');
var playersDB = new Datastore({ filename: 'C:/HIDEAWAY-NEVERDELETE/database-tables/players.db', autoload: true});
var activePlayersDB = new Datastore({ filename: 'C:/HIDEAWAY-NEVERDELETE/database-tables/activeplayers.db', autoload: true});
var activityToday = getTodayOrYesterday();
const filePath = 'C:/HIDEAWAY-NEVERDELETE/logs/ActivityLog-' + activityToday + '.db';
var activityLogFileExists = false;

if (fs.existsSync(filePath)) {
    var ActivityLog = new Datastore({ filename: filePath, autoload: true});
    activityLogFileExists = true;
}

var activePlayersTable;
var activityLogTable;

$(function() {
    // Current Players Table
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

                activePlayersTable = new Tabulator("#activePlayersTable", {
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
                        {title:"Sit $ Left", field:"sitMoneyLeft", formatter:alertSitMoney},
                        {title:"Add Sit $", field:"addSitMoney", formatter:addSitMoneyForActivyPlayers},
                    ],
                });
            }
        }
    });

    // ActivityLog is always correct with the right date so we can grab all records
    if(activityLogFileExists) {
        ActivityLog.find({}, (err, records) => {
            if (err) {
                console.error("Error Grabbing Players: " + err);
            } else {
                if (records && records.length) {
                    activityLogTable = new Tabulator("#loggedPlayersTable", {
                        data:records,
                        layout:"fitColumns",
                        initialSort:[
                            {column:"endTimeStamp", dir:"dec"},
                        ],
                        index:"playerID",
                        columns:[
                            {title:"PlayerID", field:"playerID", width:200},
                            {title:"First Name", field:"firstName"},
                            {title:"Last Name", field:"lastName"},
                            {title:"Clocked In", field:"startTimeStamp", formatter:timeStamp},
                            {title:"Clocked Out", field:"endTimeStamp", formatter:timeStamp},
                            {title:"Sit $ Left (When Clocked Out)", field:"sitMoneyLeft", formatter:alertSitMoney},
                            {title:"Add Sit $", field:"addSitMoney", formatter:addSitMoneyForActivyLog},
                        ],
                    });

                    // Hide add money form to all but last clocked for the player
                    setTimeout(function() {
                        hideDuplicateForms();
                    }, 500);
                }
            }
        });
    }

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

    function addSitMoneyForActivyPlayers(cell) {
        var playerID = cell.getRow().getData().playerID;
        var displayValue = "<div class='addsitmoney-container'><form onsubmit='addSitMoneySubmitForActivePlayers(event)'><input type='hidden' name='playerID' value='" + playerID + "'/><input class='sitMoneyInput' type='text' name='sitMoneyInput' required pattern='" + "^[\\-]&#63;\\d+$" + "'/><input type='submit' class='btn btn-primary' value='Add'/></form></div>";
        return displayValue;
    }

    function addSitMoneyForActivyLog(cell) {
        var playerID = cell.getRow().getData().playerID;
        var displayValue = "<div class='addsitmoney-container'><form onsubmit='addSitMoneySubmitForActivityLog(event)'><input type='hidden' name='playerID' value='" + playerID + "'/><input class='sitMoneyInput' type='text' name='sitMoneyInput' required pattern='" + "^[\\-]&#63;\\d+$" + "'/><input type='submit' class='btn btn-primary' value='Add'/></form></div>";
        return displayValue;
    }

    setInterval(reRenderFloorDisplayActive, 60000); // update active players table every 60 seconds
});

function addSitMoneySubmitForActivePlayers (event) {
    // Prevent the default form submission
    event.preventDefault();

    // Access the form's input elements
    const form = event.target;
    const sitMoney = parseInt(form.elements['sitMoneyInput'].value);
    const sitMoneyPlayerID = form.elements['playerID'].value;
    var firstName;
    var lastName;

    // Update the active player table
    activePlayersDB.findOne({ playerID: sitMoneyPlayerID }, (err, record) => {
        if (err) {
            console.error("Error Finding Player Record to Update: " + err);
        } else {
            if (record) {
                // Update the field you want to modify
                record.sitMoneyAdded = record.sitMoneyAdded + sitMoney;
                firstName = record.firstName;
                lastName = record.lastName;
        
                // Update the record in the database
                activePlayersDB.update({ playerID: sitMoneyPlayerID }, record, {}, (updateErr, numReplaced) => {
                    if (updateErr) {
                        console.error("Error Actually Updating the Record: " + err);
                    }
                });
                activePlayersDB.persistence.compactDatafile();
                
                reRenderFloorDisplayActive();
                $('input[type=text]').val('');
            } else {
                console.error("No Record Found! - 100");
            }
        }
    });
}

function addSitMoneySubmitForActivityLog (event) {
    // Prevent the default form submission
    event.preventDefault();

    // Access the form's input elements
    const form = event.target;
    const sitMoney = parseInt(form.elements['sitMoneyInput'].value);
    const sitMoneyPlayerID = form.elements['playerID'].value;

    // If they are actively playing don't allow ass money through here because it'll ruin their sitMoneyLeft on the players table
    activePlayersDB.findOne({ playerID: sitMoneyPlayerID }, (err, activePlayerRecord) => {
        if (err) {
            console.error("Error Finding Player Record to Update - 202: " + err);
        } else {
            if (activePlayerRecord) {
                // Tell them they need to add submit money in the above table
                
            } else if (activityLogFileExists) {
                // Update the active player table
                ActivityLog.find({ playerID: sitMoneyPlayerID }, (err, activityLogRecords) => {
                    if (err) {
                        console.error("Error Finding Player Record to Update - 202: " + err);
                    } else {
                        if (activityLogRecords && activityLogRecords.length) {
                            var activityLogRecord = activityLogRecords[activityLogRecords.length-1];
                            // Update the field you want to modify
                            activityLogRecord.sitMoneyAdded = activityLogRecord.sitMoneyAdded + sitMoney;
                            activityLogRecord.sitMoneyLeft = activityLogRecord.sitMoneyLeft + sitMoney;
                    
                            ActivityLog.update({ _id: activityLogRecord._id }, activityLogRecord, (err, docs) => {
                                if (err) console.log('ActivityLog Error: ', err);
                            });
                            ActivityLog.persistence.compactDatafile();

                            reRenderFloorDisplayActivityLog(activityLogRecord);

                            // Add Sit Money yo the Players Table since they're not clocked in anymore
                            playersDB.findOne({ playerID: sitMoneyPlayerID }, (err, playerRecord) => {
                                if (err) {
                                    console.error("Error Finding Player Record to Update - 203: " + err);
                                } else {
                                    if (playerRecord) {
                                        playerRecord.sitMoneyBought = playerRecord.sitMoneyBought + sitMoney;

                                        // Update the record in the database
                                        playersDB.update({ playerID: sitMoneyPlayerID }, playerRecord, {}, (updateErr, numReplaced) => {
                                            if (updateErr) {
                                                console.error("Error Actually Updating the Record: " + err);
                                            }
                                        });
                                        playersDB.persistence.compactDatafile();
                                    }
                                }
                            });
                        } else {
                            console.error("No Record Found! - 100");
                        }
                    }
                });
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
                activePlayersTable.updateData([{playerID:record.playerID, sitMoneyLeft:record.sitMoneyLeft}]);
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

function generateRandomString() {
    const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randomString = '';
  
    for (let i = 0; i < 16; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomString += characters.charAt(randomIndex);
    }
  
    return randomString;
  }

function showFailure() {
    $('#failure').fadeIn();
    setTimeout(function () {
        $('#failure').fadeOut();
      }, 3000);
}

function reRenderFloorDisplayActivityLog (activityLogRecord) {
    if (activityLogFileExists) {
        ActivityLog.find({}, (err, records) => {
            if (err) {
                console.error("Error Grabbing Players: " + err);
            } else {
                if (records && records.length) {
                    activityLogTable.setData(records);
                    setTimeout(function() {
                        hideDuplicateForms();
                    }, 1000);
                }
            }
        });
    }
}

function hideDuplicateForms() {
    // Get all form elements
    const forms = $('form');

    // Iterate through each form
    forms.each(function(index, form) {
    const inputs = $(form).find('input'); // Find all input elements within the form
    const values = [];

    // Iterate through each input to get their values
    inputs.each(function(inputIndex, input) {
        values.push($(input).val()); // Push the value of each input into the array
    });

    // Check if there is a form with the same input values before the current form
    if (forms.slice(0, index).filter(function() {
        const otherInputs = $(this).find('input');
        return inputs.length === otherInputs.length && values.every(function(value, i) {
        return value === otherInputs.eq(i).val();
        });
    }).length > 0) {
        $(form).hide(); // Hide the current form
    }
    });
}