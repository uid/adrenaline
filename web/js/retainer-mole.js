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

function retainerHide() {
    $('#onesecContainer').hide();
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
	var theURL = 'rts/mole/ready?workerid=' + workerid + '&assignmentid=' + assignmentid;
	
	$.get(theURL, function(data) {	
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

    loading();
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

function loading() {
    $('#onesecContainer').show();

    // How long should the loading indicator show up?
    minWait = 0;
    maxWait = 20; // we should expect that under 13 seconds people will hang out
    actualWait = Math.floor(Math.random() * (maxWait - minWait + 1) + minWait); //http://www.admixweb.com/2010/08/24/javascript-tip-get-a-random-number-between-two-integers/
    //actualWait = 3;
    console.log("Planning to wait for: " + actualWait);
    /*
    var finishTime = new Date(times.show.getTime());
    finishTime.setSeconds(finishTime.getSeconds() + actualWait);
    times.tryshowmole = finishTime;
    */

    moleTimeout = window.setTimeout(function() {
	    console.log("Showing moles");
	    $('#onesecContainer').remove();
	    $('#moletable').css('visibility', 'visible');
	    times.donewaiting = getServerTime();
    }, actualWait * 1000);
    
    

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