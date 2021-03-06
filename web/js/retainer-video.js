var showTimeout;
var checkInterval;
var bucket = null;

function scheduleRetainer(showCallback, defaultWorkURL) {
    if (isPreview()) {
        // don't do this in preview mode
        console.log("In preview mode, not setting timer.");
        return;
    }
    
    pollDataReady(showCallback);
    setMaxWaitCallback(showCallback, defaultWorkURL);
    showCountdown();
    pingAlive();
}

// Hides the text from the user
function retainerHide() {
    //$('#taskText').css("visibility", "hidden")
}

// Sets a callback to fire and show the text to the user
function setMaxWaitCallback(showCallback, defaultWorkURL) {
    var waitTime = maxWaitTime * 1000;

    console.log("max wait time: " + waitTime);
   showTimeout = window.setTimeout(function() {
        // if we haven't already shown work, do it now
        if (times.show == null) {
	    console.log("No work -- showing random work")
	    window.clearTimeout(checkInterval);
	    window.clearTimeout(showTimeout);

	    // get a random piece of work
	    var randomURL = defaultWorkURL + "?assignmentid=" + assignmentid;
	    if (videoid != 0) {
	        // manually specify video
	        randomURL += "&videoid=" + videoid
	    }
	    if (isSlow) {
	        // make sure we're in slow mode
	        randomURL += "&slow=1";
	    }
	    $.get(randomURL, function(data) {
		    showCallback(data);
		});
	}
    }, waitTime);
    
}

/* Tells the server that we're still watching */
function pingAlive() {
    // different pings depending on which phase they are in
    if (times.go != null) {
        logEvent("ping-working");
    } else if (times.show != null) {
        logEvent("ping-showing");    
    } else if (times.accept != null) {
        logEvent("ping-waiting");    
    }
    window.setTimeout(pingAlive, 5000);
}


function generatePoll(callback) {
    var theFunction = function() {
	var theURL = 'rts/video/ready?workerid=' + workerid + '&assignmentid=' + assignmentid;
	
	if (isSlow) {
	    theURL = theURL + '&slow=1';
	}
	
	// if they specified a video, use that
	if (videoid != 0) {
	    theURL = theURL + "&videoid=" + videoid;
	}
	
	$.get(theURL, function(data) {
	
	/*
	    data = {
	        filename: 'charlie-short',
	        height: 360,
	        is_ready: true,
	        phase: {
	            min: 0,
	            max: 1,
	            numworkers: 1,
	            phase: 756,
	            phase_list: 200,
	            start: 1302292921.57
	        },
	        videoid: 1,
	        width: 640
	    };
	*/
		if (data['is_ready']) {
		    window.clearTimeout(checkInterval);
		    window.clearTimeout(showTimeout);
            
		    callback(data);
		} else {
		    checkInterval = window.setTimeout(generatePoll(callback), 1000);
		}
	    });
    };

    return theFunction;
}

function pollDataReady(showCallback) {
    var beginPolling = generatePoll(showCallback);
    beginPolling();
}

function showGoButton() {
    console.log("GO!");
    $('#retainer').hide();
    $('#donebtn').hide();
    $('#waitContainer').hide();
    $('#goContainer').hide();  
    
    
    if (isTetris) {
        simulatePause();
    }

    times.show = getServerTime();
    logEvent("display", { 'showTime': times.show }, null);
    
    if (isAlert) {
        playSound();
        alert('Start now!');
        console.log("alert dismissed");
        // log immediately after they click the OK button
        showText();
    } else {
        $('#goContainer').html("<button id='readybtn'>Go!</button>");
        $('#readybtn').click(showText);
    }
}

// Shows the text to the user
function showText() {
    times.go = getServerTime();
    logEvent("go");     // log that they're starting the task
    
    stopSound();    // stop any alert sound that's playing
    
    if (isReward) {
        var timeDiff = times.go - times.show;
        
        var timeString = "You "
        if (isAlert) {
            timeString = timeString + " dismissed the alert "
        } else {
            timeString = timeString + " clicked the Go! button "
        }        
        
        timeString = timeString +  "in " + (timeDiff / 1000) + " seconds.";
        if (timeDiff < maxRewardTime * 1000) {
            timeString = timeString + " You get the bonus!";
            $('#time-report').css('color', 'red');
        }
        $('#time-report').html(timeString).fadeIn();
    }
    
    //$('#donebtn').show();
    if (assignmentid != 0) {
        $('#donebtn').attr("disabled", "").html("Submit");    
    }
    $('#taskText').css("visibility", "visible");
    $('#taskContainer').effect('highlight', {}, 3000);
}

function playSound() {
    try {
        var s = soundManager.getSoundById('alert-sound');
        s.play();
    } catch(e) {
        console.log("sound file not loaded yet, do nothing");
    }
}

function stopSound() {
    try {
        var s = soundManager.getSoundById('alert-sound');
        s.stop();
    } catch (e) {
        // it's fine, there probably was no sound playing
    }
}

function showCountdown() {
    var waitUntil = (new Date()).add({seconds: maxWaitTime});
    $('#countdown').countdown({until: waitUntil, format: 'MS'});      
}