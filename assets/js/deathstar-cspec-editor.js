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

function errorOutput(text){
	cmdOutput(text, true, 'errormsg');
}

function debugOutput(text, newline){
	cmdOutput(text, newline, 'cmdmsg');
}

function successOutput(text){
	cmdOutput(text, true, 'successmsg');
}

function timestampOutput(text){
	cmdOutput(getDate() + ' ' + text, true, 'timestampmsg');
}

function cmdOutput(text, newline, cmdclass){
	var pretext='', posttext='';
	if (cmdclass) {
		pretext = '<span class="' + cmdclass + '">';
		posttext = '</span>'
	}
	var eol = newline ? '<br><br>' : '<br>';
	var myDiv = document.getElementById('div-preview-inline');
	var s = myDiv.innerHTML;
	var anchor='<a id="end"></a>'
	var news = s.substring(0, s.indexOf(anchor)) + pretext + text + posttext + eol + anchor;
	myDiv.innerHTML = news;
	document.getElementById('end').scrollIntoView();
//	myDiv.innerHTML += pretext + text + posttext + eol + '<a id="end"/>';
  
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

//  $(window).unload(function(){ layoutState.save('deathstar-spec-editor-layout') });

  myLayout = $('body').layout({
  	applyDefaultStyles: true,
  	stateManagement__enabled: true, 
  	onresize_end: resizePanes, 
  	useStateCookie: true,
  	 cookie: {
    //  State Management options
        name: "deathstar-spec-editor-layout" // If not specified, will use Layout.name
    ,   autoSave: true // Save cookie when page exits?
    ,   autoLoad: true // Load cookie when Layout inits?
    //  Cookie Options
    ,   domain: ""
    ,   path: ""
    ,   expires: "30" // 'days' -- blank = session cookie
    ,   secure: false
    //  State to save in the cookie - must be pane-specific
    ,   keys: "north.size,south.size,east.size,west.size,"+
 
"north.isClosed,south.isClosed,east.isClosed,west.isClosed,"+
 
"north.isHidden,south.isHidden,east.isHidden,west.isHidden"
    }
}); 

  $('#save-button').click(pushSpec);
  $('#push-align').click(pushSpecPermissive);
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

function pushSpec(){
	pushSpecRoute('push');
}

function pushSpecPermissive()
{
	if (confirm('Rewrite topic titles to align them with the latest edits?'))
		pushSpecRoute('push', '-p');
}

function pushSpecRoute(cmd, opts)
{
	socket || (socket = io.connect(nodeServer)); 	
	socket && emitPush(cmd, opts);
	socket.on('connect', function () {
		debugOutput('Connected to server ' + nodeServer);

		socket.on('cmdoutput', function (msg){
			cmdOutput(msg);
		});

		socket.on('cmdfinish', function (msg){});

		socket.on('cmdexit', function(msg){ 
    	//socket.disconnect();
    	if (msg == '0') {
    		successOutput('Content Specification pushed successfully', true);
    		loadSkynetTopic();
    	}
    	else
    	{
    		errorOutput('The push was not successful. Exit Code: ' + msg, true);
    	}
    	endServerTask();
    });
	});
}

function emitPush(cmd, opts)
{
	var cmdobj = {
		'command' : cmd, 
		'server' : deets.skynetURL, 
		'spec': editor.getValue()
	};
	if (opts) cmdobj.opts = opts;
	timestampOutput(' Initiating ' + cmd);
	socket.emit('pushspec', cmdobj);
	startServerTask();
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
  	//socket.on('cmdfinish', function (msg){timestampOutput('Validation operation completed.')});
  	socket.on('cmdexit', function(msg){
    	//socket.disconnect(); 
    	if (msg == '0') {
    		successOutput('The Content Specification is valid', true);
    		loadSkynetTopic();
    	}
    	else
    	{
    		var errormsg = 'There was an error performing the validation. Exit code: ' + msg;
    		if (msg == '8') errormsg = 'The Content Specification is not valid';
    		errorOutput(errormsg, true);
    	}
    	endServerTask();
    });
  	emitValidate();
  });
  }

  function emitValidate(){
  	timestampOutput(' Initiating validate');
  	newCmdOutput();
  	socket.emit('pushspec', {'command':'validate', 'server': deets.skynetURL, 'spec': editor.getValue()});
  	startServerTask();
  }

  function startServerTask()
  {
  	$("#save-button").button('loading');
  	$("#push-menu").button('loading');
  	$("#validate-button").button('loading');
  	$("#revert-button").button('loading');
  	editor.setOption('readOnly', 'nocursor');
  	$('.CodeMirror').addClass('editor-readonly');	

  }

  function endServerTask()
  {
  	$("#save-button").button('reset');
  	$("#push-menu").button('reset');
  	$("#validate-button").button('reset');
  	$("#revert-button").button('reset');
  	editor.setOption('readOnly', false);
  	$('.CodeMirror').removeClass('editor-readonly');
  }