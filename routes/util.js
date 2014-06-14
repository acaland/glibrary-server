var parser = require('xml2json');
var formidable = require('formidable'),
    util = require('util'),
    fs = require('fs'),
    AMGAexec = require('./repo').AMGAexec,
    async = require('async');


String.prototype.splice = function(idx, rem, s) {
    return (this.slice(0, idx) + s + this.slice(idx + Math.abs(rem)));
};

function encodeSingleQuotes(s) {
    //console.log("encoding: " + s + " " + s.length);
    for (var i = 0; i < s.length; i++) {
        if (s[i] == '\'') {
            s = s.splice(i, 0, '\'');
            i++;
            //console.log("adding an extra quote");
        }
    }
    //console.log("encoded as: " + s + " " + s.length);
    return s;
}

function prepareAndRegisterMetadata(cdxfile, xmlfile, warc, _cb) {

    var data = fs.readFileSync(cdxfile).toString();
    var records = data.split('\n');
    var offsets = [];
    for (var i = 1; i <= records.length - 1; i++) {
        var meta = records[i].split(' ');
        if (meta.length == 10) {
            offsets.push({
                url: meta[2],
                offset: meta[8]
            })
        } else {
            offsets.push({
                url: meta[2],
                offset: meta[9]
            })
        }
    }

    var data = fs.readFileSync(xmlfile);
    var json = parser.toJson(data, {
        object: true
    });
    async.eachSeries(json.repository.record, function(r, callback2) {
        //console.log(r);

        //for (var i = 0; i < json.repository.record.length; i++) {

        //i = 0;
        var article = {};
        //var m = json.repository.record[i].metadata['oai_dc:dc'];
        var m = r.metadata['oai_dc:dc'];
        //console.log(m);
        if (typeof(m['dc:title']) == 'object') {
            if (m['dc:title'].length > 0) {
                for (var s = 0; s < m['dc:title'].length; s++) {
                    if (m['dc:title'][s]['xml:lang'] == 'en-US') {
                        article['dc_title'] = m['dc:title'][s]['$t']
                    }
                    if (m['dc:title'][s]['xml:lang'] == 'it-IT') {
                        article['dc_title_it'] = m['dc:title'][s]['$t']
                    }
                }
            } else {
                article['dc_title'] = m['dc:title']['$t'];
            }

        } else {
            article['dc_title'] = m['dc:title'];
        }

        if (m['dc:creator']) {
            article['dc_creator'] = m['dc:creator'];
        };

        if (typeof(m['dc:subject']) == 'object') {
            article['dc_subject'] = '';
            article['dc_subject_it'] = '';
            for (var s = 0; s < m['dc:subject'].length; s++) {
                if (m['dc:subject'][s]['xml:lang'] == 'en-US') {
                    if (m['dc:subject'][s]['$t']) {
                        article['dc_subject'] += (article['dc_subject'] == '') ? m['dc:subject'][s]['$t'] : ", " + m['dc:subject'][s]['$t'];
                    }
                }
                if (m['dc:subject'][s]['xml:lang'] == 'it-IT') {
                    if (m['dc:subject'][s]['$t']) {
                        article['dc_subject_it'] += (article['dc_subject_it'] == '') ? m['dc:subject'][s]['$t'] : ", " + m['dc:subject'][s]['$t'];
                    }
                }
            }
        } else {
            article['dc_subject'] = m['dc:subject'];
        }

        if (typeof(m['dc:description']) == 'object') {
            for (var s = 0; s < m['dc:description'].length; s++) {
                if (m['dc:description'][s]['xml:lang'] == 'en-US') {
                    if (m['dc:description'][s]['$t']) {
                        article['dc_description'] = m['dc:description'][s]['$t']
                    }
                }
                if (m['dc:description'][s]['xml:lang'] == 'it-IT') {
                    if (m['dc:description'][s]['$t']) {
                        article['dc_description_it'] = m['dc:description'][s]['$t']
                    }
                }
            }
        } else {
            article['dc_description'] = m['dc:description'];
        }

        if (typeof(m['dc:publisher']) == 'object') {

            if (m['dc:publisher']['xml:lang'] == 'en-US') {
                article['dc_publisher'] = m['dc:publisher']['$t']
            }
            if (m['dc:publisher']['xml:lang'] == 'it-IT') {
                article['dc_publisher_it'] = m['dc:publisher']['$t']
            }

        } else {
            article['dc_publisher'] = m['dc:publisher'];
        }

        if (m['dc:date']) {
            article['dc_date'] = m['dc:date'];
        };

        if (typeof(m['dc:type']) == 'object') {
            article['dc_type'] = '';
            for (var s = 0; s < m['dc:type'].length; s++) {
                if (typeof(m['dc:type'][s]) == "string") {
                    article['dc_type'] += (article['dc_type'] == '') ? m['dc:type'][s] : ", " + m['dc:type'][s];
                }
            }
        } else {
            article['dc_type'] = m['dc:type'];
        }

        if (typeof(m['dc:format']) == 'object') {
            article['dc_format'] = m['dc:format'][0];
        } else {
            article['dc_format'] = m['dc:format'];
        }

        if (typeof(m['dc:identifier']) == 'object') {
            article['dc_identifier'] = m['dc:identifier'].join(', ');
            for (var s = 0; s < m['dc:identifier'].length; s++) {
                if (m['dc:identifier'][s].indexOf('/download/') != -1) {
                    for (var r = 0; r < offsets.length; r++) {
                        if (m['dc:identifier'][s] == offsets[r].url) {
                            article['Offset'] = offsets[r].offset;
                            break;
                        }
                    }
                }
            }
        } else {
            article['dc_identifier'] = m['dc:identifier']
        }

        if (typeof(m['dc:source']) == 'object') {
            for (var s = 0; s < m['dc:source'].length; s++) {
                if (m['dc:source'][s]['xml:lang'] == 'en-US') {
                    article['dc_source'] = m['dc:source'][s]['$t']
                }
                if (m['dc:source'][s]['xml:lang'] == 'it-IT') {
                    article['dc_source_it'] = m['dc:source'][s]['$t']
                }
            }
        } else {
            article['dc_source'] = m['dc:source'];
        }

        if (typeof(m['dc:language']) == 'object') {
            article['dc_language'] = m['dc:language'].join(', ');
        } else {
            article['dc_language'] = m['dc:language']
        }

        if (typeof(m['dc:relation']) == 'object') {
            article['dc_relation'] = m['dc:relation'].join(', ');
        } else {
            article['dc_relation'] = m['dc:relation']
        }

        if (typeof(m['dc:rights']) == 'object') {
            for (var s = 0; s < m['dc:rights'].length; s++) {
                if (m['dc:rights'][s]['xml:lang'] == 'en-US') {
                    article['dc_rights'] = m['dc:rights'][s]['$t']
                }
                if (m['dc:rights'][s]['xml:lang'] == 'it-IT') {
                    article['dc_rights_it'] = m['dc:rights'][s]['$t']
                }
            }
        } else {
            article['dc_rights'] = m['dc:rights'];
        }

        if (article['Offset']) {
            article['__Replica'] = 'http://glibrary.ct.infn.it/dm/warc/extract/vo.dch-rp.eu/prod-se-03.ct.infn.it/dpm/ct.infn.it/home/vo.dch-rp.eu/magdigitali/' + warc + '/' + article['Offset'];
        }
        //console.log("\n\n\n");
        //console.log(article);

        var id = "";
        async.waterfall([
            function(callback) {
                AMGAexec("sequence_next /MagDigitali/Entries/id", callback);
            },
            function(entry_id, callback) {
                id = entry_id;
                var values = "";
                for (var attr in article) {
                    if (attr.indexOf('__') != 0) {
                        values += " " + attr + ' \'' + encodeSingleQuotes(article[attr]) + '\'';
                    }
                };
                values += " Thumb " + 0;
                AMGAexec("addentry /MagDigitali/Entries/Articles/" + entry_id + values, callback);
            },
            function(result, callback) {
                AMGAexec('sequence_next /MagDigitali/Replicas/rep', callback);
            },
            function(rep_id, callback) {
                AMGAexec('addentry /MagDigitali/Replicas/' + rep_id + ' ID ' + id + ' surl ' + article['__Replica'] + ' enabled 1', callback);
            }

        ], function(err, result) {
            if (err) {
                callback2(err);
            } else {
                callback2();
            }
        });
        //}
    }, function(err, results) {
        if (!err) {
            _cb();
        } else {
            _cb(err);
        }
    });
}


exports.xml2json = function(req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {


        console.log(fields);
        //console.log(files);
        var cdx = files['cdx-inputEl'];
        if (!cdx) {
            //res.send('<script>document.domain = "glibrary.ct.infn.it";</script>' + JSON.stringify({success:false, error: 'CDX, XML or WARC file is missing'}));
            return;
        }
        var xml = files['xml-inputEl'];
        var warc = fields.FileName;
        //console.log(cdx);
        //console.log(xml);
        //console.log(warc);
        if (!cdx.size || !xml.size || !warc) {
            res.set('Content-Type', 'text/html');
            //res.send('document.domain = "glibrary.ct.infn.it";' + JSON.stringify({success:false, error: 'CDX, XML or WARC file is missing'}));
            res.json({
                success: false,
                error: 'CDX, XML or WARC file is missing'
            });
            return;
        }
        async.waterfall([
            function(callback) {
                prepareAndRegisterMetadata(cdx.path, xml.path, warc, callback);
            },
            function(results, callback) {
            	registerWarcMetadata(fields, warc, callback);
            }
        ], function(err) {
            if (!err) {
                res.json({
                    success: true
                });
            } else {
                res.json({
                    success: false,
                    error: JSON.stringify(err)
                });
            }
        });


        //console.log(util.inspect({fields: fields, files: files}));

    });
    //var json = parser.toJson(req.files);
    return;
}

exports.test = function() {
    var cdx = '/tmp/offsets.cdx';
    var xml = '/tmp/metadata.xml';
    var warc = '20130925-cilea.jlis.warc.gz';
    prepareAndRegisterMetadata(cdx, xml, warc);
}