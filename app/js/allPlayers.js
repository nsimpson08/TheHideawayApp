const $ = require('jquery');
const Tabulator = require('tabulator-tables');
var Datastore = require('nedb');
var playersDB = new Datastore({ filename: 'C:/HIDEAWAY-NEVERDELETE/database-tables/players.db', autoload: true });
var table;

$(function() {
    playersDB.find({}, (err, records) => {
        if (err) {
            console.error("Error Grabbing Players: " + err);
        } else {
            table = new Tabulator("#allPlayersTable", {
                data:records,
                layout:"fitColumns",
                initialSort:[
                    {column:"firstName", dir:"asc"},
                ],
                maxHeight:"80vh",
                columns:[
                    {title:"PlayerID", field:"playerID", width:200},
                    {title:"First Name", field:"firstName", editor:"input", editable:isRowSelected},
                    {title:"Last Name", field:"lastName", editor:"input", editable:isRowSelected},
                    {title:"Phone", field:"phone", editor:"input", editable:isRowSelected},
                    {title:"Sit Money", field:"sitMoneyBought", formatter:formatter_SitMoney},
                    {title:"Playing", field:"playing", formatter:formatter_Playing},
                    {field:"EditButton", formatter:formatter_EditButton, cellClick:cellClick_EditButton, headerSort:false, width:300},
                    {field:"CancelButton", formatter:formatter_CancelButton, cellClick:cellClick_CancelButton, headerSort:false, resizable:false, visible:false, width:100},
                    {field:"SaveButton", formatter:formatter_SaveButton, cellClick:cellClick_SaveButton, headerSort:false, resizable:false, visible:false, width:100},
                    {field:"DeleteButton", formatter:formatter_DeleteButton, cellClick:cellClick_DeleteButton, headerSort:false, resizable:false, visible:false, width:100},
                ],
            });
        }
    });
});

// FORMATTERS
function formatter_EditButton(cell) {
    return "<div class='btn btn-edit'>Edit</div>";
}
function formatter_CancelButton(cell) {
   return "<div class='btn btn-cancel'>Cancel</div>";
}
function formatter_SaveButton(cell) {
   return "<div class='btn btn-save'>Save</div>";
}
function formatter_DeleteButton(cell) {
   return "<div class='btn btn-delete'>Delete</div>";
}
function formatter_Playing(cell) {
    var value = cell.getValue();
    var displayValue = value == 1 ? "Yes" : "No";
    return displayValue;
}
function formatter_SitMoney(cell) {
    var value = cell.getValue();
    if (value <= 12) cell.getElement().classList.add('alert-num');
    var row = cell.getRow();
    if (value < 0) row.getElement().classList.add('alert-num');
    
    return value;
}

// CLICK HANDLERS
function cellClick_EditButton(e, cell){
    currentRow = cell.getRow();
    currentTable = cell.getTable();
    selectedRows = currentTable.getSelectedRows();
    if (selectedRows.length == 0) {
        for (i = 0; i < selectedRows.length; i++) {
            selectedRows[i].deselect();
            selectedRows[i].reformat();
        }

        currentTable.deselectRow();
        currentRow.select();
        currentRow.reformat();
        cells = currentRow.getCells();

        for (i = 0; i < cells.length; i++) {
            cells[i].setValue(cells[i].getValue());
        }

        currentTable.hideColumn("EditButton");
        currentTable.showColumn("CancelButton");
        currentTable.showColumn("DeleteButton");
        currentTable.showColumn("SaveButton");
    }
}
function cellClick_CancelButton(e, cell){
    if (!cell.getRow().isSelected()){
        return;
    }

    currentRow = cell.getRow();
    currentTable = cell.getTable();
    
    if (cell.getRow().isSelected()){
        cells = currentRow.getCells();
        
        for (i = 0; i < cells.length; i++) {
            cells[i].restoreOldValue();
        }

        stopEditing(cell);
    }
}
function cellClick_SaveButton(e, cell){
    if (!cell.getRow().isSelected()){
        return;
    }

    updateField(cell.getRow());
    stopEditing(cell);
}
function cellClick_DeleteButton(e, cell){
    if (!cell.getRow().isSelected()){
        return;
    }

    if (cell.getRow().getData().playing == 1) {
        alert("Cannot delete player who is currently playing");
    } else if (window.confirm("Delete the player "+ cell.getData().firstName + " " + cell.getData().lastName + "?")) {
        stopEditing(cell);
        handleDeletePlayer(cell.getData().playerID); // Remove player from the DB
        cell.getRow().delete();
    }
}
function stopEditing(cell){
    currentRow = cell.getRow();
    currentTable = cell.getTable();
    currentTable.deselectRow();
    currentTable.showColumn("EditButton");
    currentTable.hideColumn("CancelButton");
    currentTable.hideColumn("DeleteButton");
    currentTable.hideColumn("SaveButton");
    currentRow.reformat();
  }
function isRowSelected(cell){
    return cell.getRow().isSelected();
}
function updateField (row) {
    var playerID = row.getData().playerID;
    var recordUpdate = {
        playerID: row.getData().playerID,
        firstName: row.getData().firstName,
        lastName: row.getData().lastName,
        phone: row.getData().phone,
        sitMoneyBought: parseInt(row.getData().sitMoneyBought),
        playing: row.getData().playing
    };

    updateDB(recordUpdate, playerID);
}

function updateDB (recordUpdate, playerID) {
    playersDB.findOne({ playerID: playerID }, (err, record) => {
        if (err) {
            console.error("Error Finding Player Record to Update: " + err);
        } else {
            if (record) {            
                // Update the record in the database
                playersDB.update({ playerID: playerID }, recordUpdate, {}, (updateErr, numReplaced) => {
                    if (updateErr) {
                        console.error("Error Actually Updating the Record: " + err);
                    }
                });

                playersDB.persistence.compactDatafile();
            } else {
                console.error("No Record Found! - 100");
            }
        }
    });
}

function handleDeletePlayer(deletePlayerID) {
    playersDB.remove({ playerID: deletePlayerID }, {}, function (err, numRemoved) {
        if (err) {
            console.error("Error Finding Player Record to Delete: " + err);
        } else {
            playersDB.persistence.compactDatafile();
        }
    });
}

function submitForm() {
    let playerSearch = cleanInput($('#playerSearch').val());
    const query = {
        $or: [
          { firstName: new RegExp(playerSearch, 'i') },
          { lastName: new RegExp(playerSearch, 'i') }
        ]
    };

    table.destroy();

    playersDB.find(query, (err, records) => {
        if (err) {
            console.error("Error Finding Player Record for All Players Table: " + err);
        } else {
            if (records && records.length) {
                var newTable = new Tabulator("#allPlayersTable", {
                    data:records,
                    layout:"fitColumns",
                    initialSort:[
                        {column:"firstName", dir:"asc"},
                    ],
                    maxHeight:"80vh",
                    columns:[
                        {title:"PlayerID", field:"playerID", width:200},
                        {title:"First Name", field:"firstName", editor:"input", editable:isRowSelected},
                        {title:"Last Name", field:"lastName", editor:"input", editable:isRowSelected},
                        {title:"Phone", field:"phone", editor:"input", editable:isRowSelected},
                        {title:"Sit Money", field:"sitMoneyBought", formatter:formatter_SitMoney},
                        {title:"Playing", field:"playing", formatter:formatter_Playing},
                        {field:"EditButton", formatter:formatter_EditButton, cellClick:cellClick_EditButton, headerSort:false},
                        {field:"CancelButton", formatter:formatter_CancelButton, cellClick:cellClick_CancelButton, headerSort:false, resizable:false, visible:false},
                        {field:"SaveButton", formatter:formatter_SaveButton, cellClick:cellClick_SaveButton, headerSort:false, resizable:false, visible:false},
                        {field:"DeleteButton", formatter:formatter_DeleteButton, cellClick:cellClick_DeleteButton, headerSort:false, resizable:false, visible:false},
                    ],
                });

                table = newTable;
            } else {
                $('#failure').fadeIn();
                setTimeout(function () {
                    $('#failure').fadeOut();
                }, 3000);
            }
        }
    });
};

function cleanInput(data) {
    data = data.trim();
    data = data.replace(/\\/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#039;').replace(/"/g, '&quot;');
    return data;
}