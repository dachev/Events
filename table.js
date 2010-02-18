// fixes Date.js
Date.prototype.isDaylightSavingTime = function() {
    return Date.today().set({month: 0, day: 1}).getTimezoneOffset() != this.getTimezoneOffset();
}

// source parser
function procTraining(url, xml) {
    var pairs = [];
    
    var dl = y.xpath(xml, '//div[contains(h3, "Upcoming")]')..dl;
    var item = {};
    for each (var el in dl.*) {
        var name = el.name();
    
        if (name != 'dt' && name != 'dd') {
            continue;
        }
    
        item[name] = el;
    
        if (item['dt'] && item['dd']) {
            pairs.push(item);
            item = {};
        }
    }
  
    var today     = Date.today();
    var events    = [];
    var dtRangeRe = /(.+[0-9]{4}),\s*(.+)\s*-\s*(.+)/;
    
    for (var i = 0; i < pairs.length; i++) {
        var pair  = pairs[i];
        var text  = stringValue(pair['dt']);
        var href  = makeAbsURL(url, pair['dt']..a.@href);
        var dates = stringValue(pair['dd']);
    
        if (!text || !href || !dates) { continue; }
        
        // extract dates
        var bdate, btime, etime, matches;
        if ((matches = dtRangeRe.exec(dates)) && matches.length == 4) {
            btime = Date.parse(matches[1] + ', ' + matches[2] + ' GMT-600');
            etime = Date.parse(matches[1] + ', ' + matches[3] + ' GMT-600');
        }
        if (btime) {
            bdate = btime.clone().clearTime();
        }
    
        // make sure we've got the dates
        if (!bdate || !btime || !etime) { continue; }
        if (bdate.isBefore(today)) { continue; }
        if (btime.isBefore(today)) { continue; }
        if (btime.isAfter(etime)) { continue; }
        
        // adjust for daylight saving
        if (bdate.isDaylightSavingTime()) {
            bdate.addHours(-1);
        }
        if (btime.isDaylightSavingTime()) {
            btime.addHours(-1);
        }
        if (etime.isDaylightSavingTime()) {
            etime.addHours(-1);
        }
        
        // create response object
        var item = {
            type  : 'training',
            title : text,
            href  : href,
            btime : btime.getTime() + '',
            etime : etime.getTime() + '',
            bdate : bdate.getTime() + ''
        };
        
        events.push(item);
    }
    
    return events;
}

// source parser
function procTutorials(url, xml) {
    var tuples = [];
    
    var trs = y.xpath(xml, '//tr');
    for each (var tr in trs) {
        var cnt   = 0;
        var tuple = {};
        
        var tds = y.xpath(tr, '//td');
        for each (var td in tds) {
            var name = td.name();
            
            if (cnt == 0) {
                tuple['date'] = stringValue(td);
            }
            else if (cnt == 1) {
                tuple['time'] = stringValue(td);
            }
            else if (cnt == 2) {
                tuple['title'] = stringValue(td);
                tuple['href']  = makeAbsURL(url, td..a.@href);
            }
            else {
                tuples.push(tuple);
                break;
            }
            
            cnt++;
        }
    }
    
    var today       = Date.today();
    var events      = [];
    var timeRangeRe = /(.+)\s*-\s*(.+)/;
    
    for (var i = 0; i < tuples.length; i++) {
        var tuple = tuples[i];
        
        if (!tuple['date'] || !tuple['time'] || !tuple['title'] || !tuple['href']) {
            continue;
        }
        
        // extract dates
        var bdate = Date.parse(tuple['date'] + ', 00:00:00 GMT-600');
        var btime, etime, matches;
        if ((matches = timeRangeRe.exec(tuple['time'])) && matches.length == 3) {
            btime = Date.parse(tuple['date'] + ', ' + matches[1] + ' GMT-600');
            etime = Date.parse(tuple['date'] + ', ' + matches[2] + ' GMT-600');
        }
        
        // make sure we've got the dates
        if (!bdate || !btime || !etime) { continue; }
        if (bdate.isBefore(today)) { continue; }
        if (btime.isBefore(today)) { continue; }
        if (btime.isAfter(etime)) { continue; }
        
        // adjust for daylight saving
        if (bdate.isDaylightSavingTime()) {
            bdate.addHours(-1);
        }
        if (btime.isDaylightSavingTime()) {
            btime.addHours(-1);
        }
        if (etime.isDaylightSavingTime()) {
            etime.addHours(-1);
        }
        
        // create response object
        var item = {
            type  : 'tutorial',
            title : tuple['title'],
            href  : tuple['href'],
            btime : btime.getTime() + '',
            etime : etime.getTime() + '',
            bdate : bdate.getTime() + ''
        };
        
        events.push(item);
    }
    
    return events;
}

// creates a sorted array combining the resuls from all sources
function mergeEvents(responses) {
	var events = [];
	
    for (var type in responses) {
    	var response = responses[type];
    	
        for (var idx in response) {
            var event = response[idx];
            
            events.push(event);
        }
    }
    
    events.sort(function(a, b) {
    	var left  = a.btime ? a.btime : a.bdate;
    	var right = b.btime ? b.btime : b.bdate;
    	
        return left - right;
    });
    
    return events;
}

// the function signature says it all
function makeAbsURL(base, href) {
    var aUrl = '';
  
    try {
        var bUrl = Url.parse(base);
        var hUrl = Url.parse(href);
        var aUrl = Url.resolve(bUrl, hUrl);
    } catch(e) {;}
    
    return aUrl;
}

// extracts the text content of an XML element
function stringValue(node) {
    var value = "";
  
    if (node.hasSimpleContent()) {
        value = node.toString();
    }
    else {
        for each (var c in node.children()) {
            value += stringValue(c);
        }
    }
  
    return trim(value);
}

// removes leading and trailing whitespace from a string
function trim(str) {
    return str.replace(/^[\s]*/,'').replace(/[\s]*$/,'');  
}

// main function
function main(config) {
    var responses = {};

    for (var name in config) {
        var source = config[name];
        var url    = source['url'];
        var xpath  = source['xpath'];
        var proc   = source['proc'];
        var query  = y.query("select * from html where url=@url and xpath=@xpath", {url:url, xpath:xpath});

        responses[name] = proc(url, query.results);
    }

    var events = mergeEvents(responses);
    response.object = {event:events};
}

var config = {
    training : {
        url   : 'http://uttc.umn.edu/training/',
        xpath : CSS2XPATH('#NewsSection'),
        proc  : procTraining
    },
    tutorial : {
        url   : 'https://www.msi.umn.edu/tutorial/',
        xpath : CSS2XPATH('#mainContent div.tut table'),
        proc  : procTutorials
    }
};

main(config);


