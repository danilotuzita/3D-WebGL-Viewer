/**
 * Created by Danilo S. Tuzita on 12/06/2016.
 */
function loadResource(url, json, cb)
{
    var request = new XMLHttpRequest();
    request.open('GET', url + '?cache=' + Math.random(), true);
    request.onload = function ()
    {
        if(request.status < 200 || request.status > 299)
        {
            cb('ERROR: HTTP status ' + request.status + ' on resource '+ url);
        }
        else
        {
            if(!json)
            {
                console.log(url, 'FALSE');
                cb(null, request.responseText);
            }
            else
            {
                // console.log(url, 'TRUE');
                cb(null, JSON.parse(request.responseText));
            }
        }
    };
    request.send();
}

function toRad(deg)
{
    return glMatrix.toRadian(deg);    
}

