
// TODO:
// 1. Add the ability to click on the title and edit it
// 2. Add buttons to insert elements
// 3. General usability enhancements like coloured state messages and action button locations

nodeServer="http://deathstar1.usersys.redhat.com:8888"
// window.previewserverurl="http://127.0.0.1:8888";
window.refreshTime=1000;
window.timerID=0;
window.clientXSLFile="assets/xsl/docbook2html.xsl";
// window.restProxy="http://127.0.0.1:8888/";
window.mutex=0;
validXML=false;
var validationServerResponse;
var port;
var urlpath;
var serverURL;
var topicID;
var skynetURL;
var helpHintsOn;

function setCookie(c_name,value,exdays)
{
var exdate=new Date();
exdate.setDate(exdate.getDate() + exdays);
var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
document.cookie=c_name + "=" + c_value;
}

function getCookie(c_name)
{
var i,x,y,ARRcookies=document.cookie.split(";");
for (i=0;i<ARRcookies.length;i++)
{
  x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
  y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
  x=x.replace(/^\s+|\s+$/g,"");
  if (x==c_name)
    {
    return unescape(y);
    }
  }
}

$(window).keypress(function(event) {
    if (!(event.which == 115 && event.ctrlKey) && !(event.which == 19)) return true;
    if (pageIsEditor){
      if (! $("#save-button").prop("disabled")) 
        doSave();
    }
    event.preventDefault();
    return false;
});

$(document).keydown(function(event) {
    // Ctrl-Shift-D hotkey for Tag Wrap
    if (String.fromCharCode(event.which).toLowerCase() == 'd' && event.ctrlKey && event.shiftKey){
	 doTagWrap();
	return false;
    }

    // Ctrl-S hotkey for Save
    //19 for Mac Command+S
    if (!( String.fromCharCode(event.which).toLowerCase() == 's' && event.ctrlKey) && !(event.which == 19)) return true;

    if (pageIsEditor){
      if (! $("#save-button").prop("disabled")) 
        doSave();
    }
    event.preventDefault();
    return false;
});


function timedRefresh(){ 
  updateXMLPreviewRoute(editor.getValue(), document.getElementsByClassName("div-preview"));
  if (window.timerID != 0) {
    clearTimeout(window.timerID);
    window.timerID = 0;
  }
}
        
window.onbeforeunload = function (e) {
  if (! $("#save-button").prop("disabled") === true) 
    return 'You have unsaved changes.';
};

// callback function for use when a node server is generating the live HTML preview
function handleHTMLPreviewResponse(ajaxRequest, serverFunction){
  if (ajaxRequest.readyState==4)
  {
    window.mutex = 0;
    if (ajaxRequest.status == 200 || ajaxRequest.status == 304)
    {

      if (serverFunction == "preview")
      {

        divpreview=document.getElementById("div-preview");
            if (divpreview.hasChildNodes)
              while(divpreview.hasChildNodes())
                divpreview.removeChild(divpreview.lastChild);
                            
        if (ajaxRequest.responseXML !== null)
        {
          section=ajaxRequest.responseXML.getElementsByClassName("section");
          if (section !== null)
          {
            divpreview.appendChild(section[0]);
          }
        }
      }

    }

  }          
}

function doValidate(callback)
{
  if (! $("#validate-button").prop("disabled") == true || callback)
  {
    showStatusMessage("Performing validation check...", '', 'alert-info');
    serversideValidateTopic(editor, callback);
  }
}

function makeValidityAmbiguous(){
  if (validXML)
  {
    $("#validate-button").prop("disabled", false);
    showStatusMessage('Modified', '', 'alert-info');
  }
    enableSaveRevert();
}

function hideSpinner(spinner){
	$(spinner).css("visibility", "hidden");
}

function showSpinner(spinner){
	$(spinner).css("visibility", "visible");
}

// Checks if the topic is valid, and then persists it using a node proxy to do the PUT
function doSave()
{ 
  if (! $("#save-button").prop('disabled'))
  {  
    disableSaveRevert();
    // if the validate button is enabled, then we'll call validation before saving
    if ( $("#validate-button").prop('disabled') == false)
      // This needs to be a callback, because validation is asynchronous
     { doValidate(doActualSave); }
    else
    { doActualSave(); }
  }
  return false;
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

function doActualSave()  
{
	if (! validXML && validationServerResponse == 1)
	  {
	    alert("This is not valid Docbook XML. If you are using Skynet injections I cannot help you.");
      $("#validate-button").prop("disabled", false);
	  }
    if (validationServerResponse == 0)
    	{
    	alert("Unable to perform validation. Saving without validation.");
    	}
    showStatusMessage("Performing Save...", '', 'alert-info')
	  saveAjaxRequest= new XMLHttpRequest();
    saveAjaxRequest.onreadystatechange=function()
    {
      if (saveAjaxRequest.readyState==4)
      {
       // ajaxStop();
        if (saveAjaxRequest.status == 200 || saveAjaxRequest.status == 304)
        {     
          showStatusMessage("Saved OK", '', 'alert-success');
          $("#save-button").prop("disabled", true);
          $("#revert-button").prop("disabled", true);
          if (! validXML) doValidate();
        }
        else
        {
          showStatusMessage("Error saving. Status code: " + saveAjaxRequest.status, '', 'alert-error');
          enableSaveRevert();
        }
      }
    }
    requestURL="/seam/resource/rest/1/topic/update/json";  
     saveAjaxRequest.global=true;

    saveAjaxRequest.open("POST", 'http://' + skynetURL + requestURL, true);
    saveAjaxRequest.setRequestHeader("Content-Type", "application/json");
    var updateObject={
      'id' : topicID,
      'configuredParameters' : ['xml'],
      'xml' : editor.getValue()};
      updateString=JSON.stringify(updateObject);

    saveAjaxRequest.send(updateString);
}

// Sends the editor content to a node server for validation
function serversideValidateTopic(editor, callback){
  ajaxRequest = new XMLHttpRequest();
  //ajaxStart();
  ajaxRequest.onreadystatechange=function()
  {
     if (ajaxRequest.readyState==4)
     {
        //ajaxStop();
        if (ajaxRequest.status == 200 || ajaxRequest.status == 304)
        {
          validationServerResponse=1;
          if (ajaxRequest.responseText == "0")
          { 
            showStatusMessage("Topic XML is valid Docbook 4.5",'', 'alert-success');
            validXML=true;
            $("#validate-button").prop('disabled', true); 
            if (callback && typeof(callback)=="function") callback(); 
            } 
          else {
            showStatusMessage('Topic has errors (click to reveal/hide)', ajaxRequest.responseText, 'alert-error');
            validXML=false;
            if (callback && typeof(callback)=="function") callback();
          }
        }
        else
        {
        	showStatusMessage("Error performing validation: " + ajaxRequest.status, '', 'alert-error');
        }
     }
  }
  validationServerReponse=0;
  ajaxRequest.open("POST", nodeServer + "/topicvalidate", true);
  ajaxRequest.setRequestHeader("Content-Type", "text/xml");
  ajaxRequest.send(editor.getValue());
}

function updateXMLPreviewRoute(cm,preview){
  // serverFunction = "validate";
  // serverFunction = "preview";
  //serversideUpdateXMLPreview(cm,preview, serverFunction);
  clientsideUpdateXMLPreview(cm,preview);
}

function loadXMLDoc(dname)
{
if (window.XMLHttpRequest)
  {
  xhttp=new XMLHttpRequest();
  }
else
  {
  xhttp=new ActiveXObject("Microsoft.XMLHTTP");
  }
xhttp.open("GET",dname,false);
xhttp.send("");
return xhttp.responseXML;
}
 

// This function generates the live HTML preview in the browser using XSLT
function clientsideUpdateXMLPreview(cm, preview){
  xsl=loadXMLDoc(clientXSLFile);
  try{  
    var xml = (new DOMParser()).parseFromString(cm, "text/xml");
    xsltProcessor=new XSLTProcessor();
    xsltProcessor.importStylesheet(xsl);
    resultDocument = xsltProcessor.transformToFragment(xml,document);
    $(preview).html(resultDocument);
/*      divpreview=document.getElementById("div-preview");
      if (divpreview.hasChildNodes)
        while(divpreview.hasChildNodes())
          divpreview.removeChild(divpreview.lastChild);
       
      divpreview.appendChild(resultDocument); */
  }
  catch(err)
  {
    donothing=1;
  }
}

// Decompose skynetURL to server URL, server port, and path
// for REST GET and POST of the topic XML
function generateRESTParameters()
{
  topicID = url_query('topicid');
  skynetURL = url_query('skyneturl');
  // Take off the leading "http://", if it exists
  if (! skynetURL === false)  {
    if (skynetURL.indexOf("http://") !== -1)    
      skynetURL=skynetURL.substring(7);

    portstart=skynetURL.indexOf(":");
    portend=skynetURL.indexOf("/");

    if (portstart !== -1)
    {
      // Deals with the case of a URL with a port number, eg: skynet.whatever.com:8080
      port=skynetURL.substring(portstart+1,portend);
      urlpath=skynetURL.substring(portend);
      serverURL=skynetURL.substring(0, portstart);
    }
    else
    {
      if (portend !== -1)
      {
        // Deals with the case of a URL with no port number, but a path after the server URL
        port="80";
        urlpath=skynetURL.substring(portend);
        serverURL=skynetURL.substring(0, portend);
      }
      else
      {
        // Deals with the case of no port number and no path
        port="80";
        urlpath="/"
        serverURL=skynetURL;
      }
    }
  }
  else
  {
    $('#save-button').prop('disabled', true);
    $('#revert-button').prop('disabled', true);
    $('#skynet-button').prop('disabled', true);
  }

}

// This function sends the editor content to a node server to get back a rendered HTML view
function serversideUpdateXMLPreview(cm, serverFunction){      
            
  // If we weren't called from the 2 second timer, we must have been called by the 
  // Enter key event. In that case we'll clear the timer
  //   

   //preview.innerHTML=cm.getValue();
  if (window.mutex == 0)
  {  
    ajaxRequest = new XMLHttpRequest();
    ajaxRequest.onreadystatechange=function()
    {
        handleHTMLPreviewResponse(ajaxRequest, serverFunction);
    }
    ajaxRequest.open("POST", nodeServer + "/xmlpreview", true);
    ajaxRequest.setRequestHeader("Content-Type", "text/xml");
    ajaxRequest.send(cm.getValue());
    window.mutex = 1;   
  }
}

/*function onUnload()
{
  if ( document.getElementbyId("button-save") && ! document.getElementById("button-save").disabled)
  {
    var r=confirm("You have unsaved changes. Do you want to discard them?");
  }
}*/

// Parse URL Queries
// from http://www.kevinleary.net/get-url-parameters-javascript-jquery/
function url_query( query ) {
	query = query.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var expr = "[\\?&]"+query+"=([^&#]*)";
	var regex = new RegExp( expr );
	var results = regex.exec( window.location.href );
	if( results !== null ) {
		return results[1];
		return decodeURIComponent(results[1].replace(/\+/g, " "));
	} else {
		return false;
	}
}

function setPageTitle(topicTitle)
{
  var titleHTML;
  var pageTitle;
//  $("#page-title").html(topicID + ": ");
  if (topicTitle) {
    pageTitle = topicID + ': ' + topicTitle;
    titleHTML = '<a href="' + skynetButtonURL + '" target="_blank">' + pageTitle + '</a>';
    $("#page-title").html(titleHTML);
    document.title=pageTitle;
  }
}

// Creates a link to the read-only rendered view, useful for passing to people for preview
function injectPreviewLink()
{
  $("#preview-link").html('<a href="preview.html?skyneturl=http://'+skynetURL+'&topicid='+topicID+'">Preview Link</a>');
}

// This function loads the topic xml via JSONP, without a proxy
function loadSkynetTopicJsonP(topicID, skynetURL)
{
  if (topicID && skynetURL) 
  {
    requestURL="/seam/resource/rest/1/topic/get/jsonp/"+topicID+"?callback=?";  
    requeststring=skynetURL+requestURL;
    $.getJSON("http://"+requeststring, function(json) {
    if (json.xml == "") json.xml="<section>\n\t<title>"+json.title+"</title>\n\n\t<para>Editor initialized empty topic content</para>\n\n</section>";      
    if (pageIsEditor) {
      window.editor.setValue(json.xml);
      disableSaveRevert();
      doValidate();
      injectPreviewLink();
    }
    setPageTitle(json.title);
    updateXMLPreviewRoute(json.xml, document.getElementsByClassName("div-preview"));
    window.title=json.title;
  });
  }
}

function onPreviewPageLoad()
{
  generateRESTParameters();
  loadSkynetTopicJsonP(topicID, skynetURL)
}

function serverTopicLoadCallback(topicAjaxRequest)
{
  if (topicAjaxRequest.readyState==4)
  {
    if (topicAjaxRequest.status == 200 || topicAjaxRequest.status == 304)
    {  
      // Load the server response into the editor
      window.editor.setValue(topicAjaxRequest.response);
      disableSaveRevert();
      doValidate();
      updateXMLPreviewRoute(editor, document.getElementsByClassName("div-preview"));
      editorTitle=document.getElementById("page-title");
      setEditorTitle(topicTitle[0].firstChild.nodeValue);
      
/*          if (editorTitle)
      {
        editorTitle.innerHTML=topicID+": ";
        topicTitle=topicAjaxRequest.responseXML.getElementsByTagName("title");
        if (topicTitle)
          editorTitle.innerHTML=editorTitle.innerHTML+topicTitle[0].firstChild.nodeValue;
      }
*/
    }
  }

}
// This function loads the topic xml using a node.js proxy server
// Currently unused, as we're loading via JSONP
function loadSkynetTopicNodeProxy(topicID,skynetURL)
{ 
 if (topicID && skynetURL) 
  {
  // Load codemirror contents from Skynet URL
    topicAjaxRequest= new XMLHttpRequest();
    topicAjaxRequest.onreadystatechange=serverTopicLoadCallback(topicAjaxRequest)
    

    requestURL="/seam/resource/rest/1/topic/get/xml/"+topicID+"/xml";  
    requestString="?serverurl="+serverURL+"&requestport="+port+"&requesturl="+urlpath+requestURL;    
    // alert(restProxy+requestString);
    topicAjaxRequest.open("GET", nodeServer + "/restget" + requestString, true);
    topicAjaxRequest.send(null);
    }
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

function disableSaveRevert()
{
    $('#save-button').prop('disabled', true);
    $('#revert-button').prop('disabled', true);
}

function doRevert(){
    loadSkynetTopicJsonP(topicID,skynetURL);
}


function ajaxStart()
{
  //$('#loadingDiv').show();
  ajaxLoader.start();
}

function ajaxStop() {
//  $('#loadingDiv').hide();
  ajaxLoader.stop();
}

function toggleHelpHints()
{
  helpHintsOn = !helpHintsOn;
  if (helpHintsOn){
    $('.btn').popover({'trigger': 'hover'});
    $('.btn').popover('enable');
    }
  else
  {
    $('.btn').popover('disable')
  }
  toggleButton('#helpHintsToggle', helpHintsOn);

  setCookie('helpHintsOn', helpHintsOn, 365); 
}

function toggleButton(btn, state)
{
  if (state)
  {
    $(btn).removeClass('btn-primary').addClass('btn-danger');
  }
  else
  {
    $(btn).removeClass('btn-danger').addClass('btn-primary');
  }

}
function toggleAutoCloseTag()
{
  var newState = ! editor.getOption('closeTagEnabled');
  editor.setOption('closeTagEnabled', newState);
  setCookie('tagAutoClose', newState, 365);
  toggleButton('#tagCloseToggle', newState);
}

// This is the onload function for the editor page
function initializeTopicEditPage(){

  function resizePanes() {

    var paneSize;
    // resize codemirror editor width
    paneSize = $('.ui-layout-center').width();
    $('.CodeMirror, .CodeMirror-scroll').css('width', paneSize - 12);

    // resize preview tab 
    $('#div-preview-pane').width(paneSize - 12);

    // resize codemirror editor height
    paneSize = $('.ui-layout-center').height();
    $('.CodeMirror, .CodeMirror-scroll').css('height', paneSize - 154);

    $('.CodeMirror').trigger("resize"); 

    // resize preview east pane
    paneSize = $('.ui-layout-east').width();
    $('#div-preview-inline').width(paneSize - 15);          
  }    

  window.mutex = 0;
  var myHeight = getCookie('editor.height') || "300px";
  var myWidth = getCookie('editor.width') || "770px";

  // Create our Codemirror text editor
  window.editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    		mode: 'text/html',
		extraKeys: {
			"'>'": function(cm) { cm.closeTag(cm, '>'); },
			"'/'": function(cm) { cm.closeTag(cm, '/'); }
  		},	   			
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

    // Toggle Close Tag
    $('#tagCloseToggle').click(toggleAutoCloseTag);

    // enable close tag by default
    editor.setOption('closeTagEnabled', true);
    $('#tagCloseToggle').button('toggle');
    toggleButton('#tagCloseToggle', true);

    // if there is a cookie to disable, then do that
    if (getCookie('tagAutoClose') == 'false')
    {
       editor.setOption('closeTagEnabled', false);
       $('#tagCloseToggle').button('toggle');
       toggleButton('#tagCloseToggle', false);

    }

   // Toggle Help Hints
   $('#helpHintToggle').click(toggleHelpHints);
   helpHintsOn = false;
   if (getCookie('helpHintsOn') == 'true')
   {
      helpHintsOn = true;
      $('#helpHintsToggle').button('toggle');
      toggleHelpHints();
    }

    
//    $("#auto-complete-toggle, #validate-button, #save-button, #revert-button, #skynet-button, #codetabs-button, #tagwrap-button, #codetabs-lite-button").button ();
    $("#validate-button").click(doValidate);
    $("#save-button").click(doSave);
    $("#revert-button").click(doRevert);
    $("#skynet-button").click(openTopicInSkynet);
    $("#codetabs-button").click(injectCodetabs);
    $("#tagwrap-button").click(doTagWrap);
    $("#codetabs-lite-button").click(injectCodetabsLite);
    $("#auto-complete-toggle").click(toggleAutoCloseTag);
    
    $('.inject-template').click(injectTemplate);

    // function handler for the validation error text show/hide
    $('.validation-toggle').click(function(e){
       $('.div-validation').slideToggle('slow');
       e.preventDefault();
     });

    myLayout = $('body').layout({
      applyDefaultStyles: true,
      stateManagement__enabled: true, 
      onresize_end: resizePanes
    });
    
  resizePanes();


    // topicid and skyneturl need to be written into the url by fixlinks.php / fixlinks in docs-hack-fixlinks.js
    generateRESTParameters();
  
    loadSkynetTopicJsonP(topicID,skynetURL);
    skynetButtonURL="http://"+skynetURL+"/TopicEdit.seam?topicTopicId="+topicID;
}


// This is a generic click handler for Insert Docbook sub-menu entries
// It uses the id attribute of the sub-menu entry to look up the template in a 
// dictionary. 
function injectTemplate(){
  var templates={'inject-varlistentry': '  	<varlistentry>\n\
    	<term></term>\n\
      	<listitem>\n\
          <para></para>\n\
        </listitem>\n\
    </varlistentry>',
    'inject-twocolumntable' :
    '   <table>\n\
	   <title></title>\n\
	    <tgroup cols="2">\n\
		   <thead>\n\
			   <row>\n\
				   <entry>\n\
					   Column 1 heading\n\
				   </entry>\n\
				    <entry>\n\
					   Column 2 heading\n\
				   </entry>\n\
			   </row>\n\
		   </thead>\n\
		    <tbody>\n\
			   <row>\n\
				   <entry>\n\
				      <para>\n\
				      </para>\n\
				   </entry>\n\
				   <entry>\n\
					   <para>\n\
					   </para>\n\
				   </entry>\n\
			   </row>\n\
		   </tbody>\n\
	   </tgroup>\n\
   </table>',
    'inject-threecolumntable' :
    '   <table>\n\
	   <title></title>\n\
	    <tgroup cols="3">\n\
		   <thead>\n\
			   <row>\n\
				   <entry>\n\
					   Column 1 heading\n\
				   </entry>\n\
				    <entry>\n\
					   Column 2 heading\n\
				   </entry>\n\
				   <entry>\n\
					   Column 3 heading\n\
				   </entry>\n\
			   </row>\n\
		   </thead>\n\
		    <tbody>\n\
			   <row>\n\
				   <entry>\n\
				      <para>\n\
				      </para>\n\
				   </entry>\n\
				   <entry>\n\
					   <para>\n\
					   </para>\n\
				   </entry>\n\
				   <entry>\n\
					   <para>\n\
					   </para>\n\
				   </entry>\n\
			   </row>\n\
		   </tbody>\n\
	   </tgroup>\n\
   </table>',
    'inject-picture' :
    '   <figure>\n\
		<title></title>\n\
		<mediaobject>\n\
			<imageobject>\n\
				<imagedata align="center" fileref="images/PUTTHENUMBERHERE.png"/>\n\
			</imageobject>\n\
			<textobject>\n\
			   <phrase>\n\
			   </phrase>\n\
			</textobject>\n\
		</mediaobject>\n\
   </figure>',
    'inject-procedure':
    '   <procedure>\n\
      <title></title>\n\
      <step>\n\
         <para>\n\
         </para>\n\
      </step>\n\
      <step>\n\
         <substeps>\n\
            <step>\n\
               <para>\n\
               </para>\n\
            </step>\n\
         </substeps>\n\
      </step>\n\
   </procedure>\n\
   <formalpara>\n\
      <title>Result</title>\n\
      <para>\n\
      </para>\n\
   </formalpara>'};
  window.editor.replaceSelection(templates[this.id]);
  makeValidityAmbiguous();        
}

function injectCodetabs(){
 var  codetabblock="<variablelist role=\"codetabs\">\n\
  <varlistentry>\n\
<!-- Other language terms: C#/.NET, Ruby, JavaScript, Node.js, HTML -->\n" +  
"    <term>Python</term>\n\
    <listitem>\n\
      <programlisting language=\"Python\">      </programlisting>\n\
    </listitem>\n\
  </varlistentry>\n\
  <varlistentry>\n\
    <term>C++</term>\n\
    <listitem>\n\
      <programlisting language=\"C++\">      </programlisting>\n\
    </listitem>\n\
  </varlistentry>\n\
  <varlistentry>\n\
    <term>Java</term>\n\
    <listitem>\n\
      <programlisting language=\"Java\">      </programlisting>\n\
    </listitem>\n\
  </varlistentry>\n\
</variablelist>\n";
  window.editor.replaceSelection(codetabblock);
  makeValidityAmbiguous();
}

function injectCodetabsLite(){
  var codetabblock1="<variablelist role=\"codetabs\">\n  <varlistentry>\n    <term>Python</term>\n    <listitem>\n";
  var codetabblock2 = "      <programlisting language=\"Python\">      </programlisting>\n";
  var codetabblock3="    </listitem>\n  </varlistentry>\n</variablelist>\n";
  var text = "";
  text = window.editor.getSelection();
  if (text){
        newcode = codetabblock1	+ text + codetabblock3;
  }
  else
  { newcode= codetabblock1 + codetabblock2 + codetabblock3;}
  window.editor.replaceSelection(newcode);
  makeValidityAmbiguous();
}


function doTagWrap(){
  var closetag;
  var tag = prompt("Wrap with tag", "tag");

  // This allows the user to enter attributes
  // We separate the tag from any attributes
  if ( tag != '' ){
    var space = tag.indexOf(' ');
    if ( space == -1)
       closetag = tag;
    else
       closetag = tag.substring(0, space);

    currenttext=window.editor.getSelection();
    tag = tag.replace('<', '');
    tag = tag.replace('>', '');
    window.editor.replaceSelection('<'+tag+'>' + currenttext + '</' +closetag+'>');
    makeValidityAmbiguous();
  }
  return false;
}


function createCommentLinks()
{
	editlinks=document.getElementsByClassName('edittopiclink')
	for (var i=0; i < editlinks.length; i++)
	{
	  div=document.createElement('div');
	  commentlink=document.createElement('a');
	  newhref=editlinks[i].href.split('editor/index').join('editor/preview');
	  commentlink.setAttribute('href', newhref);
	  commentlink.innerHTML="Comments";
	  commentlink.setAttribute('class', 'deathstar-preview-link');
	  div.appendChild(commentlink);
	  editlinks[i].parentNode.appendChild(commentlink);
	}
}

function openTopicInSkynet()
{
  window.open(skynetButtonURL,'_blank');
}
