const $ = require('jquery');
const Tabulator = require('tabulator-tables');
var Datastore = require('nedb');
var playersDB = new Datastore({ filename: 'C:/HIDEAWAY-NEVERDELETE/database-tables/players.db', autoload: true});
var activePlayersDB = new Datastore({ filename: 'C:/HIDEAWAY-NEVERDELETE/database-tables/activeplayers.db', autoload: true});

function submitForm() {
    let playerSearch = cleanInput($('#playerSearch').val());
    const query = {
        $or: [
          { firstName: new RegExp(playerSearch, 'i') },
          { lastName: new RegExp(playerSearch, 'i') }
        ]
    };

    playersDB.find(query, (err, records) => {
        if (err) {
            console.error("Error Finding Player Record for Clockin Player Search: " + err);
        } else {
            if (records && records.length) {
                new Tabulator("#playerSearchReturn", {
                    data:records,
                    layout:"fitColumns",
                    initialSort:[
                        {column:"firstName", dir:"asc"},
                    ],
                    maxHeight:"70vh",
                    columns:[
                        {title:"PlayerID", field:"playerID", width:200},
                        {title:"First Name", field:"firstName"},
                        {title:"Last Name", field:"lastName"},
                        {title:"Sit Money", field:"sitMoneyBought", formatter:alertSitMoney},
                        {title:"Clock In", field:"playing", formatter:displayClock},
                    ],
                });
            } else {
                $('#failure').fadeIn();
                setTimeout(function () {
                    $('#failure').fadeOut();
                }, 3000);
            }
        }
    });
};

function displayClock(cell) {
    var value = cell.getValue();
    var playerID = cell.getRow().getData().playerID;
    var displayValue = value == 1 ? "Already Clocked In" : "<div id='clockinsubmit-container'><button id='clockin-submit' class='btn btn-primary' onclick='clockInSubmit(event)' data-playerid='" + playerID + "'>Clock In</button></div>";
    return displayValue;
}

function alertSitMoney(cell) {
    var value = cell.getValue();
    if (value <= 12) cell.getElement().classList.add('alert-num');
    var row = cell.getRow();
    if (value < 0) row.getElement().classList.add('alert-num');

    return value;
}

function clockInSubmit (event) {
    const button = event.currentTarget;
    const playerID = button.getAttribute('data-playerid');

    let player = {
        "playerID": playerID,
        "firstName": '',
        "lastName": '',
        "startTimeStamp": new Date(),
        "sitMoneyStarted": 0,
        "sitMoneyAdded": 0,
        "sitMoneyUsed": 0,
        "sitMoneyLeft": 0
    }

    // Clock them into players.db
    playersDB.findOne({ playerID: playerID }, (err, record) => {
        if (err) {
            console.error("Error Finding Player Record to Submit Clockin: " + err);
        } else {
            if (record) {
                // Grab player for activePlayer update
                player.firstName = record.firstName;
                player.lastName = record.lastName;
                player.sitMoneyStarted = record.sitMoneyBought;
                player.sitMoneyLeft = record.sitMoneyBought;

                // Update the field you want to modify
                record.playing = 1;
        
                // Update the record in the database
                playersDB.update({ playerID: playerID }, record, {}, (updateErr, numReplaced) => {
                    if (updateErr) {
                        console.error("Error Actually Updating the Record for Clockin: " + err);
                    }
                });

                playersDB.persistence.compactDatafile();

                // Add them to activePlayers.db
                activePlayersDB.insert(player, (err, docs) => {
                    if (err) console.log('Uh oh...', err);
                    else {
                        $('#clockinsubmit-container button[data-playerid="' + playerID + '"]').parent().parent().html('Clocked In');
                    }
                });
            } else {
                console.error("No Record Found! - 101");
            }
        }
    });
}

function cleanInput(data) {
    data = data.trim();
    data = data.replace(/\\/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#039;').replace(/"/g, '&quot;');
    return data;
}