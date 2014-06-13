var parser = require('xml2json');
var formidable = require('formidable'),
 	util = require('util'),
 	fs = require('fs').
 	AMGAexec = require('./repo').AMGAexec;

exports.xml2json = function(req, res) {
	 var form = new formidable.IncomingForm();
	
	form.parse(req, function(err, fields, files) {



		var cdx = files['cdx-inputEl'].path;
		var data = fs.readFileSync(cdx);
		var records = data.split('\n');
		var offsets = [];
		for (var i = 1; i <= records.length-1; i++) {
			var meta = records[i].split(' ');
			if (meta.length == 10) {
				offsets.push({url: meta[2], offset: meta[8]})
			} else {
				offsets.push({url: meta[2], offset: meta[9]})
			}
		}
		var xml = files['xml-inputEl'].path;
		var data = fs.readFileSync(xml);
		
		var json = parser.toJson(data, {object:true});
		for (var i = 0; i < json.repository.record.length; i++) {
			var metadata = json.repository.record[i].metadata['oai_dc:dc'];

		}


      		//console.log(util.inspect({fields: fields, files: files}));
		res.json("ok");
    	});
	//var json = parser.toJson(req.files);
	return;
}
