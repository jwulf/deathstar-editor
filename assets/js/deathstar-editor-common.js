function disableSaveRevert()
{
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