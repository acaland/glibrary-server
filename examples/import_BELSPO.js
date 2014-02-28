var fs = require('fs');
var exec = require('child_process').exec;
var request = require('request');
var async = require('async');

var data = fs.readFileSync('metadata.json');
var json = JSON.parse(data);

var se = ['https://prod-se-03.ct.infn.it/dpm/ct.infn.it/home/vo.dch-rp.eu/belspo/',
    'https://gridsrv3-4.dir.garr.it/dpm/dir.garr.it/home/vo.dch-rp.eu/belspo/',
    'https://se.reef.man.poznan.pl/dpm/reef.man.poznan.pl/home/vo.dch-rp.eu/belspo/'
];

var records = json.adlibXML.recordList.record;
console.log("num of records:" + records.length);
var i = 0;
//for (var i = 0; i < records.length; i++) {
//var r = [];
//r.push(records[0]);
async.eachSeries(records, function(item, callback) {
    console.log(i++ + ")");
    console.log(item);
    console.log("\n");
    // check the existence of object_number
    var pattern = "?" + item.object_number.slice(1) + "*.tif";
    exec('ls ' + pattern, function(err, stdout, stderr) {
        if (!err) {
            //console.log(stdout);
            var replica = [];
            for (path in se) {
                replica.push(se[path] + stdout.trim());
            }
            //console.log(replica);
            var entry = {}
            //console.log(Object.keys(records[i]));
            for (var attr in item) {
                var value = item[attr];
                var key = attr.replace(/\./g, "_");

                //console.log("key:" + key);
                //console.log("value: ");
                //console.log(value);
                //console.log("typeof value:"  + typeof(value));
                //console.log("isArray:" + (value instanceof Array)); */
                if (value instanceof Array) {
                    if (value[0] instanceof Object && Object.keys(value[0]).length == 0) {
                        continue;
                    }
                    entry[key] = value.join();
                } else if (value instanceof Object && Object.keys(value).length == 0) {
                    continue;
                } else {
                    entry[key] = value;
                }

                //console.log(entry[key] + "\n");
            } 
            if (entry['modification']) {
            	entry['LastModificationDate'] = entry['modification'];
            	delete entry['modification'];
            }
            if (typeof(entry['selected']) != 'undefined')  {
            	delete entry['selected'];
            }
	    var thumbfile = (stdout.trim()).slice(0,-4) + ".jpg";
	    console.log("thumbfile: " + JSON.stringify(stdout.trim()));
	    try {
	    	var thumb = fs.readFileSync(thumbfile);
            	var thumb64 = new Buffer(thumb).toString('base64');
		entry['__ThumbData'] = thumb64;
	    } catch(err) {
		console.log(err);
		console.log("thumbnail not found!");
		entry['Thumb'] = 1;
	    }
            //entry['__ThumbData'] = thumb64;
            entry['Size'] = fs.statSync(stdout.trim()).size;
            //entry['Thumb'] = 1;
            entry['FileType'] = 'TIF';
            entry['FileName'] = stdout.trim();
            entry['__Replicas'] = replica.join();
            console.log(entry);
            request.post('http://glibrary.ct.infn.it:3000/BELSPO/kikirpa/', {
				form: entry
			}, function(err, resp, body) {
				if (!err) {
					console.log(body);
					callback();	
				} else {
					console.log(err);
				}
				
			}); 
			
        } else {
            	console.log("file not found");
            	callback();
        }
    });
});
