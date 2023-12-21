const $ = require('jquery');
const Tabulator = require('tabulator-tables');
var Datastore = require('nedb');
var activityLogTable;

const fs = require('fs');
const path = require('path');

$(function() {
    $('#datepicker').val(getTodayOrYesterday());

    $('#datepicker').on('change', function() {
        var datelog = $('#datepicker').val();
        
        // Grab the actual db file and see if it exists
        const filePath = 'C:/HIDEAWAY-NEVERDELETE/logs/ActivityLog-' + datelog + '.db';

        if (!fs.existsSync(filePath)) {
            showFailure();
        } else {
            // Update the front-end telling them what day log they are viewing
            updateViewingText(datelog);

            var ActivityLog = new Datastore({ filename: filePath, autoload: true});
            
            ActivityLog.find({}, (err, records) => {
                if (err) {
                    console.error("Error Grabbing Players: " + err);
                } else {
                    if (records && records.length) {
                        activityLogTable = new Tabulator("#activityLogTable", {
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
                                {title:"Clocked Out", field:"endTimeStamp", formatter:timeStamp},
                                {title:"Sit $ Started", field:"sitMoneyStarted"},
                                {title:"Sit $ Added", field:"sitMoneyAdded"},
                                {title:"Sit $ Used", field:"sitMoneyUsed"},
                                {title:"Sit $ Left", field:"sitMoneyLeft", formatter:alertSitMoney},
                            ],
                        });
                    } else {
                        // The Activity Log file doesn't exist
                        // Show a message and delete the file
                        showFailure();
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
    });

    $('#datepicker').trigger('change');
});

function updateViewingText(datelog) {
    // Convert to text and show which log is being viewed on the front end
    var datelogDate = new Date(datelog);
    var originalDay = datelogDate.getDate();

    datelogDate.setDate(originalDay + 1); // Increment the day by 1

    // Check if the original day was the last day of the month
    if (originalDay === new Date(datelogDate.getFullYear(), datelogDate.getMonth() + 1, 0).getDate()) {
        datelogDate.setMonth(datelogDate.getMonth() + 1); // Move to the next month
    }

    const monthText = datelogDate.toLocaleString('default', { month: 'short' });
    const dayText = datelogDate.getDate();
    $('.viewLink .date-time').html(monthText + '. ' + dayText);
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

function showFailure() {
    $('#failure').fadeIn();
    setTimeout(function () {
        $('#failure').fadeOut();
      }, 3000);
}