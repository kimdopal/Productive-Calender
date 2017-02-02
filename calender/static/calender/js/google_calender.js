var CLIENT_ID = '1058916560306-0oheqaces62v33hn2o9lbvljvmgc40q6.apps.googleusercontent.com';
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
var SCOPES = "https://www.googleapis.com/auth/calendar";

var authorizeButton = document.getElementById('authorize-button');

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
  gapi.client.init({
    discoveryDocs: DISCOVERY_DOCS,
    clientId: CLIENT_ID,
    scope: SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    // authorizeButton.onclick = handleAuthClick;
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    listUpcomingEvents();
  }
}


function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}


function listUpcomingEvents() {
  gapi.client.calendar.events.list({
    'calendarId': 'primary',
    'timeMin': (new Date("2017-01-01")).toISOString(),
    'timeMax': (new Date("2017-12-31")).toISOString(),
    'showDeleted': false,
    'singleEvents': true,
    'orderBy': 'startTime'
  }).then(function(google_response) {
    $.getJSON("alleventsj/", function(db_response) {
        db_response = db_response["response"];
        console.log(db_response, google_response);
        google_response = google_response.result.items;
        db_response_items_num = Object.keys(db_response).length;

        for (var i = 0; i < db_response_items_num; i++) {
            if (db_response[i]["deleted"] == true) {
                try {
                    gapi.client.calendar.events.delete({
                        'calendarId' : 'primary',
                        'eventId' : db_response[i]["event_google_id"]
                    }).then(function(data) {
                        $.get("forceDelete/", {eventId: db_response[i]["event_id"]}, function(res) {
                            console.log("Deleted", res);
                        });
                    });
                } catch(err) {
                    $.get("forceDelete/", {eventId: db_response[i]["event_id"]}, function(res) {
                        console.log("Deleted", res);
                    });
                }
            }
        }

        for (var i = 0; i < db_response_items_num; i++) {
            db_event_id = db_response[i]["event_id"];
            if (db_response[i]["event_google_id"] != "" && db_response[i]["deleted"] == false) {

                console.log("Here");

                var flag = 0;

                for (var j = 0; j < google_response.length; j++) {
                    if (google_response[j]["id"] == db_response[i]["event_google_id"]) {

                        flag = 1;

                        if ((new Date(db_response[i]["updated"])).toISOString() > google_response[j]["updated"]) {

                            var start_datetime = db_response[i]["start_date"] + " " + db_response[i]["start_time"];
                            var oldDateObj = new Date(start_datetime);
                            var updated_start_datetime = new Date(oldDateObj.getTime() + 330*60000).valueOf();
                            updated_start_datetime = String(updated_start_datetime).substr(0,10);

                            var end_datetime = db_response[i]["end_date"] + " " + db_response[i]["end_time"];
                            oldDateObj = new Date(end_datetime);
                            var updated_end_datetime = new Date(oldDateObj.getTime() + 330*60000).valueOf();
                            updated_end_datetime = String(updated_end_datetime).substr(0,10);
                            console.log(updated_end_datetime);

                            // If db event has been modified after google event, update Google event
                            gapi.client.calendar.events.update({
                                'calendarId' : 'primary',
                                'eventId' : google_response[j]["id"],
                                'summary' : db_response[i]["event_name"],
                                'start.timeZone' : 'Asia/Calcutta',
                                'start.dateTime' : updated_start_datetime,
                                'end.timeZone' : 'Asia/Calcutta',
                                'end.dateTime' : updated_end_datetime,
                                'end.time' : db_response[i]["end_time"],
                                'location' : db_response[i]["location"],
                                'description' : db_response[i]["description"]
                            }).then(function() {
                                console.log("Google calendar updated");
                            });

                        } else {

                            if (google_response[j]["start"]["dateTime"]) {

                                var date = new Date(google_response[j]["start"]["dateTime"]);
                                var year = date.getFullYear();
                                var month = date.getMonth()+1;
                                var dt = date.getDate();
                                var hour = date.getHours();
                                var mins = date.getMinutes();
                                if (dt < 10) {dt = '0' + dt;}
                                if (month < 10) {month = '0' + month;}
                                if (hour < 10) {hour = '0' + hour;}
                                if (mins < 10) {mins = '0' + mins;}

                                updated_start_date = year+'-' + month + '-'+ dt;
                                updated_start_time = hour + ":" + mins;
                                updated_all_day = 0;

                                var date = new Date(google_response[j]["end"]["dateTime"]);
                                var year = date.getFullYear();
                                var month = date.getMonth()+1;
                                var dt = date.getDate();
                                var hour = date.getHours();
                                var mins = date.getMinutes();
                                if (dt < 10) {dt = '0' + dt;}
                                if (month < 10) {month = '0' + month;}
                                if (hour < 10) {hour = '0' + hour;}
                                if (mins < 10) {mins = '0' + mins;}

                                updated_end_date = year+'-' + month + '-'+ dt;
                                updated_end_time = hour + ":" + mins;
                            
                            } else {

                                var date = new Date(google_response[j]["start"]["date"]);
                                var year = date.getFullYear();
                                var month = date.getMonth()+1;
                                var dt = date.getDate();
                                if (dt < 10) {dt = '0' + dt;}
                                if (month < 10) {month = '0' + month;}

                                updated_start_date = year+'-' + month + '-'+ dt;
                                updated_start_time = "";
                                updated_all_day = 1;

                                var date = new Date(google_response[j]["end"]["date"]);
                                var year = date.getFullYear();
                                var month = date.getMonth()+1;
                                var dt = date.getDate();
                                if (dt < 10) {dt = '0' + dt;}
                                if (month < 10) {month = '0' + month;}

                                updated_end_date = year+'-' + month + '-'+ dt;
                                updated_end_time = "";

                            }

                            var google_response_location = google_response[j]['location'];
                            if (!google_response_location) {google_response_location = "";}

                            var google_response_description = google_response[j]['description'];
                            if (!google_response_description) {google_response_description = "";}

                            $.getJSON("updateEvent/", {eventId: db_response[i]["event_id"], eventName: google_response[j]["summary"], eventLocation: google_response[j]["location"], eventStartDate: updated_start_date, eventStartTime: updated_start_time, eventEndDate: updated_end_date, eventEndTime: updated_end_time, eventAllDay: updated_all_day, eventDescription: google_response_description}, function(data) {
                                console.log(data, "DB data updated");
                            });
                        }
                        
                    }
                }

                if (flag == 0) {
                    $.get("forceDelete/", {eventId: db_response[i]["event_id"]}, function(res) {
                        console.log("Deleted because deleted from Google also", res);
                    });
                }
            } else if (db_response[i]["event_google_id"] == "") {
                // If Google ID is blank, add it to google
                if (db_response[i]["all_day"] == true || db_response[i]["start_time"] == "") {
                    var start_value = db_response[i]["start_date"];
                    var end_date = parseInt(String(db_response[i]["end_date"]).substr(8,2)) + 1;
                    var end_value = String(db_response[i]["end_date"]).substr(0,8) + String(end_date);
                    var event = {
                      'summary': db_response[i]["event_name"],
                      'location': db_response[i]["location"],
                      'description': db_response[i]["description"],
                      'start': {
                        'date': start_value,
                        'timeZone': 'Asia/Calcutta'
                      },
                      'end': {
                        'date': end_value,
                        'timeZone': 'Asia/Calcutta'
                      },
                      'attendees': [
                        {'email': 'lpage@example.com'}
                      ],
                      'reminders': {
                        'useDefault': false,
                        'overrides': [
                          {'method': 'email', 'minutes': 24 * 60},
                          {'method': 'popup', 'minutes': 10}
                        ]
                      }
                    };
                } else {
                    var start_value = db_response[i]["start_date"] + "T" + db_response[i]["start_time"] + ":00";
                    var end_date = parseInt(String(db_response[i]["end_date"]).substr(8,2)) + 1;
                    var end_value = String(db_response[i]["end_date"]).substr(0,8) + String(end_date);
                    end_value = end_value + "T" + db_response[i]["end_time"] + ":00";
                    var event = {
                      'summary': db_response[i]["event_name"],
                      'location': db_response[i]["location"],
                      'description': db_response[i]["description"],
                      'start': {
                        'dateTime': start_value,
                        'timeZone': 'Asia/Calcutta'
                      },
                      'end': {
                        'dateTime': end_value,
                        'timeZone': 'Asia/Calcutta'
                      },
                      'attendees': [
                        {'email': 'anirudhgoel.delhi@gmail.com'}
                      ],
                      'reminders': {
                        'useDefault': false,
                        'overrides': [
                          {'method': 'email', 'minutes': 24 * 60},
                          {'method': 'popup', 'minutes': 10}
                        ]
                      }
                    };
                }                

                var request = gapi.client.calendar.events.insert({
                  'calendarId': 'primary',
                  'resource': event
                });

                // console.log(event);
                try{
                    request.execute(function(data) {
                        console.log("Event adding to Google", data);
                        new_google_id = data["id"];
                    });
                } catch(err) {
                    console.log(err);
                    break;
                }
                console.log(db_event_id);
                $.get("updateGoogleId/", {eventId: db_event_id, googleId: new_google_id}, function(res) {
                    console.log("Updated google id added to db", res);
                });
            }
        }



        // var events = response.result.items;

        // if (events.length > 0) {
        //   for (i = 0; i < events.length; i++) {
        //     var event = events[i];
        //     var when = event.start.dateTime;
        //     if (!when) {
        //       when = event.start.date;
        //     }
        //     // appendPre(event.summary + ' (' + when + ')')
        //   }
        // } else {
        //   // appendPre('No upcoming events found.');
        // }
    });
    refreshAllEvents();
  });
}