var deets = {
	skynetURL: '',
	nodeServer: '',
	topicID: 0
};
var skynetURL, nodeServer, TopicID;
var validXML;

window.onbeforeunload = function (e) {
  if (! $("#save-button").prop("disabled") === true) 
    return 'You have unsaved changes.';
};

function cmdOutput(text, newline){
	var eol = newline ? '<br><br>' : '<br>';
	$('.div-preview').html($('.div-preview').html() + text + eol);
}

function specEditorload(){
  deets = extractURLParameters();
  skynetURL = deets.skynetURL;
  nodeServer = deets.nodeServer;
  cmdOutput("Loading socket.io from " + nodeServer +'/socket.io/socket.io.js');
  $.getScript(nodeServer + '/socket.io/socket.io.js', function(){cmdOutput('Socket.io loaded', true);});
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
		$("#page-title").html("Editing Content Spec ID: " + deets.topicID);
	}
	disableSaveRevert();
}

function pageSetup(){

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
 	var socket = io.connect(nodeServer); // TIP: .connect with no args does auto-discovery
  socket.on('connect', function () { // TIP: you can avoid listening on `connect` and listen on events directly too!
  	cmdOutput('Connected to server ' + nodeServer);
    socket.on('cmdoutput', function (msg){
      cmdOutput(msg);
    });
    socket.on('cmdfinish', function (msg){cmdOutput('Push operation completed.')});
    socket.on('cmdexit', function(msg){ 
    	if (msg == '0') {
    		cmdOutput('Push successful', true);
    		loadSkynetTopic();
    	}
    	else
    	{
    			cmdOutput('Exit Code: ' + msg, true);
    	}
    });
  socket.emit('pushspec', {'server': deets.skynetURL, 'spec': editor.getValue()});
  
  });
 }