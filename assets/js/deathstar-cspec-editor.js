var deets = {
	skynetURL: '',
	nodeServer: '',
	topicID: 0
};
var skynetURL, nodeServer, TopicID;
var validXML;
var socket, lastcmdclass;

window.onbeforeunload = function (e) {
	if (! $("#save-button").prop("disabled") === true) 
		return 'You have unsaved changes.';
};

function debugOutput(text, newline){
	cmdOutput(text, newline, 'cmdtext');
}

function timestampOutput(text){
	cmdOutput(getDate() + ' ' + text, true, 'timestamptext');
}

function cmdOutput(text, newline, cmdclass){
	var pretext='', posttext='';
	if (cmdclass) {
		pretext = '<span class="' + cmdclass + '">';
		posttext = '</span>'
	}
	var eol = newline ? '<br><br>' : '<br>';
	$('#div-preview-inline:last-child').html($('#div-preview-inline:last-child').html() + pretext + text + posttext + eol);
}

function newCmdOutput(text){
	$('#div-preview-inline > div').css('color', 'grey');
	$('#div-preview-inline').append('<div></div>');
	text && cmdOutput(text);
}

function specEditorload(){
	deets = extractURLParameters();
	skynetURL = deets.skynetURL;
	nodeServer = deets.nodeServer;
	debugOutput('Loading socket.io from ' + nodeServer +'/socket.io/socket.io.js');
	$.getScript(nodeServer + '/socket.io/socket.io.js', function(){debugOutput('Socket.io loaded', true);});
	pageSetup();
	loadSkynetTopic();
}

function loadSkynetTopic()
{
	loadSkynetTopicJsonP(deets.topicID, deets.skynetURL, updateSpecText);
}

function updateSpecText(json)
{
	if (json.xml) {
		editor.setValue(json.xml);
		$("#page-title").html("Content Spec: " + deets.topicID + " - " + json.title);
		document.title = deets.topicID + ' - ' + json.title;
	}
	disableSaveRevert();
}

function pageSetup(){

	newCmdOutput();

	window.mutex = 0;
	var myHeight = getCookie('cspec-editor.height') || "300px";
	var myWidth = getCookie('cspec-editor.width') || "770px";

  // Create our Codemirror text editor
  window.editor = CodeMirror.fromTextArea(document.getElementById("code"), {
  	mode: 'text/plaintext',	   			
  	onChange: function(cm, e) {
  		enableSaveRevert();
  		makeValidityAmbiguous();
  	},
  	onKeyEvent: function(cm, e) {
  		if (window.timerID == 0) 
  			window.timerID = setTimeout("timedRefresh()", window.refreshTime);
  		k=e.keyCode;
  		if (k != 16 && k != 17 && k != 18 && k != 20 && k != 19 && k != 27 && k != 36 && k != 37 && k != 38 && k != 39 && k !=40 && k != 45)
  		{
  			enableSaveRevert();
  			makeValidityAmbiguous();
  		}
        		return false; // return false tells Codemirror to also process the key;
        	}, 
        	wordWrap: true,
        	lineWrapping: true,
        	height: myHeight,
        	width: myWidth,
        	disableSpellcheck: false,
        	lineNumbers: true
        });

  myLayout = $('body').layout({
  	applyDefaultStyles: true,
  	stateManagement__enabled: true, 
  	onresize_end: resizePanes
  });

  $('#save-button').click(pushSpec);
  $('#validate-button').click(validateSpec);
  $('#save-button').prop('disabled', true);
  $('#revert-button').prop('disabled', true);


  resizePanes();
}

function resizePanes() {

	var paneSize;
	// resize codemirror editor width
	paneSize = $('.ui-layout-center').width();
	$('.CodeMirror, .CodeMirror-scroll').css('width', paneSize - 15);

	// resize preview tab 
	$('#div-preview-pane').width(paneSize - 15);

	// resize codemirror editor height
	paneSize = $('.ui-layout-center').height();
	$('.CodeMirror, .CodeMirror-scroll').css('height', paneSize - 160);

	$('.CodeMirror').trigger("resize"); 

	// resize preview east pane
	paneSize = $('.ui-layout-east').width();
	$('#div-preview-inline').width(paneSize - 15);          
}    

function pushSpec()
{
	socket && emitPush();
 	socket || (socket = io.connect(nodeServer)); // TIP: .connect with no args does auto-discovery
	socket.on('connect', function () { // TIP: you can avoid listening on `connect` and listen on events directly too!
  	debugOutput('Connected to server ' + nodeServer);
	
  	socket.on('cmdoutput', function (msg){
  		cmdOutput(msg);
  	});

  	socket.on('cmdfinish', function (msg){timestampOuput('Push operation completed.')});

  	socket.on('cmdexit', function(msg){ 
    	//socket.disconnect();
    	if (msg == '0') {
    		cmdOutput('Server reported push successful', true);
    		loadSkynetTopic();
    	}
    	else
    	{
    		cmdOutput('Exit Code: ' + msg, true);
    	}
    });
  	emitPush();

  });
}

function emitPush()
{
	newCmdOutput();
	timestampOutput(' Initiating push');
	socket.emit('pushspec', {'command':'push', 'server': deets.skynetURL, 'spec': editor.getValue()});
}

function validateSpec()
{
	socket && emitValidate();
  	socket || (socket = io.connect(nodeServer)); // TIP: .connect with no args does auto-discovery
  	socket.on('connect', function () { // TIP: you can avoid listening on `connect` and listen on events directly too!
  	debugOutput('Connected to server ' + nodeServer);
  	socket.on('cmdoutput', function (msg){
  		cmdOutput(msg);
  	});
  	socket.on('cmdfinish', function (msg){timestampOutput('Validation operation completed.')});
  	socket.on('cmdexit', function(msg){
    	//socket.disconnect(); 
    	if (msg == '0') {
    		cmdOutput('Validation successful', true);
    		loadSkynetTopic();
    	}
    	else
    	{
    		cmdOutput('Exit Code: ' + msg, true);
    	}
    });
  	emitValidate();
  });
}

function emitValidate(){
	timestampOutput(' Initiating validate');
	newCmdOutput();
	socket.emit('pushspec', {'command':'validate', 'server': deets.skynetURL, 'spec': editor.getValue()});
}
