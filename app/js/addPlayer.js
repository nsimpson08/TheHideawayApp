const $ = require('jquery');
var Datastore = require('nedb');
var playersDB = new Datastore({ filename: 'C:/HIDEAWAY-NEVERDELETE/database-tables/players.db', autoload: true});
let firstName;
let lastName;

function submitForm() {
    firstName = cleanInput($('#firstName').val());
    lastName = cleanInput($('#lastName').val());
    let phone = cleanInput($('#phone').val());
    let sitMoneyBought = cleanInput($('#sitMoneyBought').val());

    const min = 111111111;
    const max = 999999999;
    const playerID = Math.floor(Math.random() * (max - min + 1)) + min;

    const player = {
        "playerID": playerID.toString(),
        "firstName": firstName,
        "lastName": lastName,
        "phone": phone,
        "playing": 0,
        "sitMoneyBought": parseInt(sitMoneyBought)
    };

    playersDB.findOne({ playerID: playerID }, (err, record) => {
        if (err) {
            showFailure();
        } else {
            if (record) {
                showFailure();
            } else {
                playersDB.insert(player, (errs, docs) => {
                    if (errs) {
                        showFailure();
                    } else {
                        showSuccess();
                    }
                });
            }
        }
    });
}

function cleanInput(data) {
    data = data.trim();
    data = data.replace(/\\/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#039;').replace(/"/g, '&quot;');
    return data;
}

function showFailure() {
    $('div#failure .failure-first-name').html(firstName);
    $('div#failure .failure-last-name').html(lastName);
    $('div#failure').fadeIn();
    setTimeout(function () {
        $('div#failure').fadeOut();
      }, 3000);
    $('#addPlayerForm').find('input[type=text]').val('');
    $('#firstName').blur().focus();
}

function showSuccess() {
    $('div#success .success-first-name').html(firstName);
    $('div#success .success-last-name').html(lastName);
    $('div#success').fadeIn();
    setTimeout(function () {
        $('div#success').fadeOut();
      }, 3000);
    $('#addPlayerForm').find('input[type=text]').val('');
    $('#firstName').blur().focus();
}