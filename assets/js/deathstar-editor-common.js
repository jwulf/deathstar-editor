// TODO: Get rid of this default and make it auto-detect
defaultNodeServer= function(){return "http://deathstar1.usersys.redhat.com:3000"}();

/** 
 * Format a date as Day Month DD YYYY HH:MM:SS PM 
From: http://kjvarga.blogspot.com.au/2009/04/output-javascript-date-in-human.html
 */  
function getDate() {  
	var date= new Date;
 	var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];  
 	var months = ["January", "February", "March", "April", "May",   
   		"June", "July", "August", "September", "October", "November", "December"];  
  	var pad = function(str) { str = String(str); return (str.length < 2) ? "0" + str : str; }  
  
 	var meridian = (parseInt(date.getHours() / 12) == 1) ? 'PM' : 'AM';  
 	var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();  
 	return days[date.getDay()] + ' ' + months[date.getMonth()] + ' ' + date.getDate() + ' '   
     + date.getFullYear() + ' ' + hours + ':' + pad(date.getMinutes()) + ':'   
     + pad(date.getSeconds()) + ' ' + meridian;  
}  
 

function disableSaveRevert()
{
    $('.save-button').prop('disabled', true);
    $('#save-button').prop('disabled', true);
    $('#revert-button').prop('disabled', true);
}

function makeValidityAmbiguous(){
  if (validXML)
  {
    $("#validate-button").prop("disabled", false);
    showStatusMessage('Modified', '', 'alert-info');
  }
    enableSaveRevert();
}

function showStatusMessage(message, error, alertType)
{
   var statusMessage;
	if (! alertType == '')
	   statusMessage = '<div class="alert ' + alertType +'">' + message + '</div>';
	else
	   statusMessage = '<div>'+ message + '</div>';
	$("#status-message").html(statusMessage);
	$("#div-validation").html(error);
}

function enableSaveRevert()
{
  if (! skynetURL === false)
  {
    $('#save-button').prop('disabled', false);
    $('#revert-button').prop('disabled', false);
    $('#skynet-button').prop('disabled', false);
  }
}
