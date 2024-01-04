const $ = require('jquery');
var Datastore = require('nedb');
var activePlayersDB = new Datastore({ filename: 'C:/HIDEAWAY-NEVERDELETE/database-tables/activeplayers.db', autoload: true});
var playersDB = new Datastore({ filename: 'C:/HIDEAWAY-NEVERDELETE/database-tables/players.db', autoload: true});
var count = 0;

function flush() {
    count = 0;
    activePlayersDB.find({}, (err, activePlayers) => {
        if (err) {
            showFailure();
        } else {
            var activePlayerIds;
            if (activePlayers && activePlayers.length) {
                activePlayerIds = activePlayers.map(obj => obj.playerID);
            } else {
                activePlayerIds = [];
            }
            
            playersDB.find({ playing: 1 }, (errz, records) => {
                if (errz) {
                    showFailure();
                } else {
                    if (records && records.length) {
                        for (var i = 0; i < records.length; i++) {
                            var record = records[i];
                            if (!activePlayerIds.includes(record.playerID)) {
                                record.playing = 0;
                                count++;
                                playersDB.update({ playerID: record.playerID }, record, {}, (updateErrz, numReplaced) => {
                                    if (updateErrz) {
                                        console.error("Error Actually Updating the Players Record: " + updateErrz);
                                    }
                                });
                            }
                        }

                        if (count > 0) {
                            playersDB.persistence.compactDatafile();
                            showSuccess();
                        } else {
                            showFailure();
                        }
                    } else {
                        showFailure();
                    }
                }
            });
        }
    });
}

function showFailure() {
    $('div#failure').fadeIn();
    setTimeout(function () {
        $('#failure').fadeOut();
    }, 3000);
}

function showSuccess() {
    $('div#success .success-num-records').html(count);
    $('div#success').fadeIn();
    setTimeout(function () {
        $('#success').fadeOut();
    }, 3000);
}