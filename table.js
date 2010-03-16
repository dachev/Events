// fixes Date.js
Date.prototype.isDaylightSavingTime = function() {
    return Date.today().set({month: 0, day: 1}).getTimezoneOffset() != this.getTimezoneOffset();
}

// adjust time to CST or CDT
Date.prototype.toUofMTime = function() {
    //var tzOffset = this.isDaylightSavingTime() ? '-500' : '-600';
    //this.setTimezoneOffset(tzOffset);
    
    var tOffset = this.isDaylightSavingTime() ? 300 : 360;
    var lOffset = this.getTimezoneOffset();
    
    this.addMinutes(tOffset - lOffset);
    
    return this;
}

// self explanatory
String.prototype.prepend = function(token) {
    return token + this;
}

// self explanatory
String.prototype.append = function(token) {
    return this + token;
}

// removes leading and trailing whitespace from a string
String.prototype.trim = function() {
    return this.replace(/^[\s]*/,'').replace(/[\s]*$/,'');  
}

// self explanatory
String.prototype.toAbsoluteURL = function(base) {
    var aUrl = '';
  
    try {
        var bUrl = Url.parse(base);
        var hUrl = Url.parse(this);
        var aUrl = Url.resolve(bUrl, hUrl);
    } catch(e) {;}
    
    return aUrl;
}

// self explanatory
Array.prototype.inArray = function (value) {
	var i;
	for (i=0; i < this.length; i++) {
		if (this[i] === value) {
			return true;
		}
	}
	return false;
};

// create an object from array
Array.prototype.getObject = function (v) {
    var o = {};
    
    for (var i = 0; i < this.length; i++) {
        o[this[i]] = v;
    }
    
    return o;
}

// check if an XML element has an HTML class name
var spaceRe = /\s+/;
function hasClass(el, name) {
    var list = el.@['class'].toString().split(spaceRe);
    var hash = list.getObject(true);
    
    return name in hash;
};

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
  
    return value.trim();
}

// source parser
function procTraining(baseUrl, xml) {
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
  
    var today     = Date.today().toUofMTime();
    var events    = [];
    var dtRangeRe = /(.+[0-9]{4}),\s*(.+)\s*-\s*(.+)/;
    
    for (var i = 0; i < pairs.length; i++) {
        var pair  = pairs[i];
        var text  = stringValue(pair['dt']);
        var href  = pair['dt']..a.@href.toString().toAbsoluteURL(baseUrl);
        var dates = stringValue(pair['dd']);
    
        if (!text || !href || !dates) { continue; }
        
        // extract dates
        var bdate, btime, etime, matches;
        if ((matches = dtRangeRe.exec(dates)) && matches.length == 4) {
            btime = Date.parse(matches[1] + ', ' + matches[2]);
            etime = Date.parse(matches[1] + ', ' + matches[3]);
        }
        if (btime) {
            bdate = btime.clone().clearTime();
        }
    
        // make sure we've got the dates
        if (!bdate || !btime || !etime) { continue; }
        
        bdate.toUofMTime();
        btime.toUofMTime();
        etime.toUofMTime();
        
        if (bdate.isBefore(today)) { continue; }
        if (btime.isBefore(today)) { continue; }
        if (btime.isAfter(etime))  { continue; }
        
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
function procTutorials(baseUrl, xml) {
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
                tuple['href']  = td..a.@href.toString().toAbsoluteURL(baseUrl);
            }
            else {
                tuples.push(tuple);
                break;
            }
            
            cnt++;
        }
    }
    
    var today     = Date.today().toUofMTime();
    var events    = [];
    var tmRangeRe = /(.+)\s*-\s*(.+)/;
    
    for (var i = 0; i < tuples.length; i++) {
        var tuple = tuples[i];
        
        if (!tuple['date'] || !tuple['time'] || !tuple['title'] || !tuple['href']) {
            continue;
        }
        
        // extract dates
        var bdate = Date.parse(tuple['date'] + ', 00:00:00');
        var btime, etime, matches;
        if ((matches = tmRangeRe.exec(tuple['time'])) && matches.length == 3) {
            btime = Date.parse(tuple['date'] + ', ' + matches[1]);
            etime = Date.parse(tuple['date'] + ', ' + matches[2]);
        }
        
        // make sure we've got the dates
        if (!bdate || !btime || !etime) { continue; }
        
        bdate.toUofMTime();
        btime.toUofMTime();
        etime.toUofMTime();
        
        if (bdate.isBefore(today)) { continue; }
        if (btime.isBefore(today)) { continue; }
        if (btime.isAfter(etime))  { continue; }
        
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

// source parser
function procLibrary(baseUrl, xml) {
    var today     = Date.today().toUofMTime();
    var dtRangeRe = /(.?[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})\s?-\s?(.+)\s?-\s?(.+)/;
    var topic     = '';
    var events    = [];
    
    var divs = y.xpath(xml, '/results/div/div');
    for each (var div in divs) {
        var isHeader = hasClass(div, 'desc_header');
        var isEvent  = hasClass(div, 'views-row');
        
        if (isHeader) {
            topic = y.xpath(div, '//h3/a').@name.toString().trim();
            continue;
        }
        
        if (topic.match(/unravel the library/i)) {
            continue;
        }
        
        if (isEvent) {
            if (!topic) { continue; }
            
             var href   = topic.toString().prepend('#').toAbsoluteURL(baseUrl);
             var dates  = stringValue(y.xpath(div, CSS2XPATH('.date-display-single')));
    
             if (!href || !dates) { continue; }
        
            // extract dates
            var bdate, btime, etime, matches;
            if ((matches = dtRangeRe.exec(dates)) && matches.length == 4) {
                btime = Date.parse(matches[1] + ', ' + matches[2]);
                etime = Date.parse(matches[1] + ', ' + matches[3]);
            }
            if (btime) {
                bdate = btime.clone().clearTime();
            }
    
            // make sure we've got the dates
            if (!bdate || !btime || !etime) { continue; }
        
            bdate.toUofMTime();
            btime.toUofMTime();
            etime.toUofMTime();
            
            if (bdate.isBefore(today)) { continue; }
            if (btime.isBefore(today)) { continue; }
            if (btime.isAfter(etime))  { continue; }
        
            // create response object
            var item = {
                type  : 'library',
                title : topic,
                href  : href,
                btime : btime.getTime() + '',
                etime : etime.getTime() + '',
                bdate : bdate.getTime() + ''
            };
        
            events.push(item);
        }
    }
    
    return events;
}

// creates a sorted array combining the resuls from all sources
function mergeEvents(responses) {
	var events = [];
	
    for (var type in responses) {
    	var response = responses[type];
    	
        for (var i = 0; i < response.length; i++) {
            var event = response[i];
            
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

// main function
function main(config) {
    XML.ignoreWhitespace = false;
    
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
        url   : 'https://www.msi.umn.edu/tutorial',
        xpath : CSS2XPATH('#mainContent div.tut table'),
        proc  : procTutorials
    },
    library : {
        url   : 'http://www.lib.umn.edu/services/workshops/registration',
        xpath : CSS2XPATH('#content-area > .view > .view-content'),
        proc  : procLibrary
    }
};

main(config);


