

function loadSkynetTopicJsonP(topicID, skynetURL, cb)
{
  if (topicID && skynetURL) 
  {
    requestURL="/seam/resource/rest/1/topic/get/jsonp/"+topicID+"?callback=?";  
    requeststring=skynetURL+requestURL;
    $.getJSON("http://"+requeststring, function(json) {
    cb && cb(json);
  });
  }
}

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

function extractURLParameters(){
	var url_params = {
	skynetURL: '',
	nodeServer: '',
	topicID: 0
	};
	url_params.nodeServer = url_query('nodeserver') || defaultNodeServer;
	url_params.topicID = url_query('topicid');
  	skynetURL = url_query('skyneturl');
  	if (skynetURL && skynetURL.indexOf("http://") !== -1)    
      skynetURL = skynetURL.substring(7);
  	url_params.skynetURL = skynetURL;
  	return url_params;
}

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
