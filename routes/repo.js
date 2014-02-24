var execFile = require('child_process').execFile;
var async = require('async');


function AMGAexec(command, callback) {
    execFile('/usr/bin/mdcli', [command], function(error, stdout, stderr) {
        console.log('amga> ' + command + '\n' + stdout);
        if (error !== null) {
            console.log('stderr: ' + stderr);
            console.log('exec error: ' + error);
            //callback(error, stderr.trim());
            callback(stderr.trim());
        } else {
            //console.log(stdout)
            //if (stdout) {
                callback(null, stdout.trim());
            //} else {
            //    callback(null);
            //}
            
        }
    });
}

exports.list = function(req, res) {
    var command = 'ls /';
    if (req.params.repo) {
        command = 'ls /' + req.params.repo;
    };
    AMGAexec(command, function(error, result) {
        if (error) {
            res.json({
                'error': result
            });
        } else {
            res.json({
                'result': result.split('\n')
            });
        }
    });
}

exports.pwd = function(req, res) {
    AMGAexec('pwd', function(error, result) {
        if (error) {
            res.json({
                'error': result
            });
        } else {
            res.json({
                'result': result.split('\n')
            });
        }
    });
}

exports.create = function(req, res) {
    var repo = req.params.repo;
    commands = [
        'createdir /' + repo,
        'createdir /' + repo + '/Entries',
        'createdir /' + repo + '/Replicas',
        'createdir /' + repo + '/Thumbs',
        'createdir /' + repo + '/Types',
        'schema_cp /template/Entries /' + repo + '/Entries',
        'schema_cp /template/Replicas /' + repo + '/Replicas',
        'schema_cp /template/Thumbs /' + repo + '/Thumbs',
        'schema_cp /template/Types /' + repo + '/Types',
        'sequence_create id /' + repo + '/Entries',
        'sequence_create id /' + repo + '/Thumbs',
        'sequence_create id /' + repo + '/Types',
        'sequence_create rep /' + repo + '/Replicas'
    ];
    async.eachSeries(commands, AMGAexec, function(err) {
        if (err) {
            res.json({
                'error': err
            });
        } else {
            res.json({
                'success': "true"
            });
        }
    });
};

exports.addType = function(req, res) {
	var repo = req.params.repo;
	var attributes = [];
    var schema = "";

    if (!req.body.__Type) {
        res.json({
            'error': 'You need to set __Type param at least'
        });
    }
    
    //console.log(typeName);
    var type = req.body.__Type.replace(/ /g, "_");
    if (req.body.__TypeName) {
        var typeName = req.body.__TypeName;
    } else {
        var typeName = type;
    }

    // extract attributes name and type from post form
    for (var attr in req.body) {
        if (attr.indexOf('__') != 0) {
            attributes.push(attr);
            schema += ' ' + attr + ' ' + req.body[attr];
        }
    };
    console.log("schema: " + schema);
    if (attributes.length == 0) {
        res.json({'error': 'you need to define at least one attribute'});
    };
    // extract VisibleAttrs or set defaults to 'Thumbs FileName Description FileType' plus 3 more max
    if (req.body.__VisibleAttrs) {
        var visibleAttrs = req.body.__VisibleAttrs;
    } else {
        var visibleAttrs = 'Thumbs FileName Description FileType';
        for (var i = 0; i < 3 && i < attributes.length; i++) {
            visibleAttrs += ' ' + attributes[i]
        }
    }
    // extract FilterAttrs or set default to 'FileType'
    if (req.body.__FilterAttrs) {
        var filterAttrs = req.body.__FilterAttrs;
    } else {
        var filterAttrs = 'FileType';
    }



    if (req.body.__ColumnWidth) {
        var columnWidth = req.body.__ColumnWidth;
    } else {
        var columnWidth = '';
        for (var i = 0; i < visibleAttrs.split(" ").length; i++) {
            columnWidth += ' 80';
        }
        columnWidth = columnWidth.trim();
    }

    // da fare in catena asincrona
    if (req.body.__ParentID) {
        var parentId = req.body.__ParentID;
    } else {
        var parentId = 0;
        //var path = '/' + repo + '/Entries/' + type;
    }
    var rootPath = '/' + repo + '/Entries/';
    var path = "";


	async.waterfall([
        function(callback) {
            if (req.body.__ParentID) {
                AMGAexec('getattr /' + repo + '/Types/' + req.body.__ParentID + ' Path', callback);
            } else {
                callback(null, null); //, '/' + repo + '/Entries/' + type);
            }
        },
        function(parentPath, callback) {
            if (parentPath) {
                //console.log("parentPath plain:" + parentPath);
                console.log("parentPath: " + parentPath.split("\n")[1]);
                path = parentPath.split("\n")[1] + '/' + type;
            } else {
                path = rootPath + type;
            }    
            //console.log(path);
            AMGAexec('createdir ' + path + ' inherited', callback);
        },
        function(stdout, callback) {
            AMGAexec('addattr ' + path + ' ' + schema, callback);
        },
        //async.apply(AMGAexec, 'addattr ' + path + ' ' + schema),
        function (stdout, callback) {
            AMGAexec('sequence_next /' + repo + '/Types/id', callback);
        },
        //async.apply(AMGAexec, 'sequence_next /' + repo + '/Types/id'),
        function(type_id, callback) {

			AMGAexec('addentry /' + repo + '/Types/' + type_id + " Path '" + path 
                + "' VisibleAttrs '" + visibleAttrs + "' FilterAttrs '" + filterAttrs + "' TypeName '" + typeName
				+ "' ColumnWidth '" + columnWidth + "' ParentID " + parentId, callback);
		}
        
	], function(err, results) {
        if (err) {
            res.json({
                'error': err
            });
        } else {
            res.json({
                'results': "success"
            });
        }
    });
};

exports.addEntry = function(req, res) {
    var repo = req.params.repo;
    var type = req.params.type;
    var path = "";


    async.waterfall([
        function(callback) {
            AMGAexec("selectattr /" + repo + "/Types:Path 'like(Path, " + '"%' + type + '")' + "'", callback)
        },
        
        function(p, callback) {
            //console.log("p:" + JSON.stringify(p));
            if (!p) {
                callback("no type found");
            } else {
                path = p;
                AMGAexec("sequence_next /" + repo + "/Entries/id", callback);
            }
        },
        function(entry_id, callback) {
            var values = "";
            for (var attr in req.body) {
                values += attr + " " + req.body[attr];
            };
            AMGAexec("addentry " + path + "/" + entry_id + " " + values, callback);
        }
    ], function(err, result) {
        if (err) {
            res.json({
                'error': err
            });
        } else {
            res.json({
                'results': "success"
            });
        }
    });
};

exports.listTypes = function(req, res) {
    var repo = req.params.repo;
    var attrs = ['FILE','TypeName','Path','VisibleAttrs','FilterAttrs','ColumnWidth','ParentID'];
    AMGAexec('selectattr /' + repo + '/Types:' + attrs.join(" ") + " ''", 
        function(err, stdout, stderr) {
            
            if (!err) {
                if (!stdout) {
                    var results = [];
                } else {
                    var results = stdout.split("\n");
                }
                console.log(JSON.stringify(results) + results.length/attrs.length);
                var types = [];
                for (var i=0; i < results.length / attrs.length; i++) {
                    var type = {};
                    for (var j=0; j < attrs.length; j++) {
                        type[attrs[j]] = results[i*attrs.length+j];
                    }
                    type['id'] = type['FILE'];
                    delete type['FILE'];
                    type['Type'] = type['Path'].replace(/.*\//, '');
                    types.push(type);
                }
                res.json({results: types});
            } else {
                res.json({error: err});
            }
    });
};


