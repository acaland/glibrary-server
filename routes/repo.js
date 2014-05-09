var execFile = require('child_process').execFile;
var async = require('async');


function AMGAexec(command, callback) {
    execFile('/usr/bin/mdcli', [command], function(error, stdout, stderr) {
        console.log('amga> ' + command);
        //console.log(stdout);
        if (error !== null) {
            console.log('stderr: ' + stderr);
            console.log('exec error: ' + error);
            //callback(error, stderr.trim());
            callback(stderr.trim());
        } else {
            //console.log(stdout)
            //if (stdout) {
                //console.log('la sto per chiamare');
                
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

exports.getSchema = function(req, res) {
	var repo = req.params.repo;
	var type = req.params.type;
	var attrs = ['FILE','TypeName','Path','VisibleAttrs','FilterAttrs','ColumnWidth','ParentID'];
	async.waterfall([
		function(callback) {
    	AMGAexec('selectattr /' + repo + '/Types:' + attrs.join(" ") + " 'like(Path, " + '"%/' + type + '")' + "'",
		function(error, stdout) {
			console.log(stdout);
			if (!error && stdout) {
				var results = stdout.split("\n");	
				var type = {};
                    		for (var j=0; j < attrs.length; j++) {
                        		type[attrs[j]] = results[j];
                    		}
                    		type['id'] = type['FILE'];
                    		delete type['FILE'];
                    		type['Type'] = type['Path'].replace(/.*\//, '');
				callback(null, type)
			} else {
				callback(error, {'error': 'No type has been found'});
			}
	});
	}, function(type, callback) {
		AMGAexec('listattr /' + type.Path, function(error, stdout) {
			if (!error) {
				var results = stdout.split("\n");
				for (var i=0; i < results.length; i=i+2) {
					type[results[i]] = results[i+1];
				}
				callback(null, type);
			} else {
				callback(error, {'error': error});
			}
		});
	}], function(err, result) {
		if (err) {
			res.json({'error': err});
		} else {
			res.json(result);
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
        'sequence_create rep /' + repo + '/Replicas',
	// dumb thumbdata creation
	'addentry /' + repo + "/0 Data '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'"
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
	
    //console.log("body: ", req.body);
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
        var visibleAttrs = 'Thumb FileName Description FileType';
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
    var id = "";
    var typeid = "";

    //console.log("body:");
    //console.log(req.body);


    if (req.body.__Replicas) {
        var replicas = req.body.__Replicas.split(','); 
    } else {
        var replicas = null;
    }

    if (req.body.__ThumbData) {
        var thumbdata = req.body.__ThumbData;

    } else {
        var thumbdata = null;
    }
    //console.log("thumbdata: "  + JSON.stringify(req.body));
    //var replicas = req.body.__Replicas || '';

    async.waterfall([
        function(callback) {
            AMGAexec("selectattr /" + repo + "/Types:Path FILE 'like(Path, " + '"%/' + type + '")' + "'", callback)
        },
        
        function(result, callback) {
            //console.log("p:" + JSON.stringify(p));
            if (!result) {
                callback("no type found");
            } else {
                path = result.split("\n")[0];
		typeid = result.split("\n")[1];
                AMGAexec("sequence_next /" + repo + "/Entries/id", callback);
            }
        },
        function(entry_id, callback) {
            if (thumbdata) {
                var thumb_id = "";
                async.waterfall([
                    async.apply(AMGAexec, "sequence_next /" + repo + "/Thumbs/id"),
                    function(id, callback2) {
                        thumb_id = id;
                        AMGAexec('addentry /' + repo + '/Thumbs/' + thumb_id + ' Data ' + thumbdata, callback2)
                    }
                    ], function(err, results) {

                        if (err) {
                            callback(err);
                        } else {
                            callback(null, entry_id, thumb_id);

                        }
                    })
            } else {
		var thumb_id = 0;
		//console.log("no thumb passed, so default to: " + thumb_id);
                callback(null, entry_id, thumb_id);
            }
        },
        function(entry_id, thumb_id, callback) {
            //console.log("thumb_id=" + thumb_id);
	    var values = "";
            id = entry_id;
            for (var attr in req.body) {
                if (attr.indexOf('__') != 0) {
                    values += " " + attr + " '" + req.body[attr] + "'";
                }
            };
            //if (thumb_id || thumb_id == 0) {
            values += " Thumb " + thumb_id;
            //};
	    if (typeid) {
	    	values += " TypeID " + typeid;
	    };
            AMGAexec("addentry " + path + "/" + entry_id + values, callback);
        },
        function(result, callback) {
            if (replicas) {
                async.eachSeries(replicas, function(replica, callback2) {
                    async.waterfall([
                        function(callback) {
                            AMGAexec('sequence_next /' + repo + '/Replicas/rep', callback)
                        },
                        //async.apply(, 'sequence_next /' + repo + '/Replicas/rep'),
                        function(rep_id, callback) {
                            AMGAexec('addentry /' + repo + '/Replicas/' + rep_id + ' ID ' + id + ' surl ' + replica + ' enabled 1', callback);
                        }
                    ], function(err, result) {
                        if (!err) {

                            callback2();
                        } 
                    });
                }, function (err, results) {
                    //console.log("ci arrivo qui?");
                    if (err) {
                        callback(err)
                    } else {
                        //res.json({
                        //    'results': "success"
                        //});
                        callback(null);
                    }
                    //console.log(" e qui, ci arrivo qui?"); 
                    

                });
                //console.log("qui fisce async");
                //console.log(" e qui no invece");
                //callback();
            } else {
                callback(null);
            }
        }
    ], function(err, result) {
        if (err) {
            res.json({
                'error': err
            });
        } else {
            res.json({
                'results': "success",
		'id': id
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
                //console.log(JSON.stringify(results) + results.length/attrs.length);
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

exports.editType = function(req, res) {
    var repo = req.params.repo;
    var type = req.params.type;

    
    var typeName = req.body.__TypeName || '';

    // extract attributes name and type from post form
    var schema = "";
    for (var attr in req.body) {
        if (attr.indexOf('__') != 0) {
            //attributes.push(attr);
            schema += ' ' + attr + " '" + req.body[attr] + "'";
        }
    };
    console.log("schema: " + schema);
    
    var visibleAttrs = req.body.__VisibleAttrs || '';
    var filterAttrs = req.body.__FilterAttrs || '';
    var columnWidth = req.body.__ColumnWidth || '';
    var parentId = req.body.__ParentID || '';


    //console.log(filterAttrs, JSON.stringify(filterAttrs));
    async.waterfall([
        function(callback) {
            AMGAexec("selectattr /" + repo + "/Types:Path FILE 'like(Path, " + '"%/' + type + '")' + "'", callback)
        },
        
        function(result, callback) {
            if (!result) {
                callback("no type found");
            } else {
                var path = result.split('\n')[0];
                var id = result.split('\n')[1];
                var cmd = '';
                if (typeName) {
                    cmd += " TypeName '" + typeName + "'";
                }
                if (visibleAttrs) {
                    cmd += ' VisibleAttrs \'' + visibleAttrs + "'"; 
                }
                if (filterAttrs) {
                    cmd += ' FilterAttrs \'' + filterAttrs + "'";
                }
                if (columnWidth) {
                    cmd += ' ColumnWidth \'' + columnWidth + "'";
                }
                if (parentId) {
                    cmd += ' ParentID ' + parentId;
                }
                var toRun = [];
                if (cmd) {
                    cmd = 'setattr /' + repo + '/Types/' + id + cmd;
                    console.log(cmd);
                    toRun.push(cmd);
                }
                if (schema) {
                    var cmd2 = 'addattr ' + path + schema;
                    console.log(cmd2);
                    toRun.push(cmd2);
                }
                async.each(toRun, AMGAexec, function(err, results) {
                        if (!err) {
                            callback(null);
                        } else {
                            callback(err);
                        }
                });
                
            }
        }], function(err, result) {
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

exports.getEntry = function(req, res) {
    var repo = req.params.repo;
    var type = req.params.type;
    var id = req.params.id;
    var path = "";
    var attrs = [];
    var entry = {};

    async.waterfall([
        async.apply(AMGAexec, "selectattr /" + repo + "/Types:Path 'like(Path, " + '"%/' + type + '")' + "'"),
        function(p, callback) {
            path = p;
            AMGAexec("listattr " + path, callback);
        },
        function(results, callback) {
            var stdout = results.split("\n");
            attrs.push('id');
            for (var i=0; i < stdout.length; i+=2) {
                attrs.push(stdout[i]);
            }
            AMGAexec("SELECT * FROM " + path + " WHERE " + path + ':FILE=' + id, callback);
        },  
        function(data, callback) {
            var results = data.split("\n").slice(attrs.length);
            //var entry = {};
            for (var i=0; i < results.length; i++) {
                entry[attrs[i]] = results[i];
            }
            callback(null, entry);           
        },
        function(entry, callback) {
            AMGAexec("selectattr /" + repo + "/Replicas:surl enabled 'ID="+id +"'", callback)
        },
        function(results, callback) {
            if (results) {
                var replicas = results.split("\n");
                console.log(replicas);
                console.log(replicas.length);
                var _replicas = [];
                for (var i=0; i<=replicas.length/3; i++) {
                    _replicas[i] = {"url": replicas[i*2], "enabled":replicas[(i*2)+1]}
                }
                entry['Replicas'] = _replicas
            }
            
            callback(null, entry);
        }
    ], function(err, entry) {
       if (err) {
            res.json({error: err});
        } else {
            res.json({results: entry}); 
        } 
    });
};



exports.listEntries = function(req, res) {
    var repo = req.params.repo;
    var type = req.params.type;
    var limit = (!req.query.limit || req.query.limit > 100) ? 100 : req.query.limit;
    var offset = req.query.offset || 0;
    var path = "";
    var attrs = [];
    var count = 0;

    async.waterfall([
        function(callback) {
            AMGAexec("selectattr /" + repo + "/Types:Path 'like(Path, " + '"%/' + type + '")' + "'", callback)
        },
        function(p, callback) {
            path = p;
            AMGAexec("listattr " + path, callback);
        },
        function(results, callback) {
            var stdout = results.split("\n");
            //console.log(stdout);
            attrs.push('id');
            for (var i=0; i < stdout.length; i+=2) {
                attrs.push(stdout[i]);
            }
            AMGAexec("SELECT COUNT(*) FROM " + path, callback);
            //console.log(attrs);
            
            //AMGAexec("SELECT * FROM " + path + ", /" + repo +"/Replicas WHERE " +
            //    path + ":FILE=/" + repo + "/Replicas.ID", callback);
        },   
        function(results, callback) {
            count = results.split("\n")[1];
            if (count) {
               AMGAexec("SELECT * FROM " + path + " LIMIT " + limit + " OFFSET " + offset, callback); 
           } else {
                callback("no entries");
           }
        }
    ], function(err, data) {
        if (err) {
            res.json({error: err});
        } else {
            var results = data.split("\n").slice(attrs.length);

            var entries = [];
            for (var i=0; i < results.length / attrs.length; i++) {
                var entry = {};
                for (var j=0; j < attrs.length; j++) {
                    entry[attrs[j]] = results[i*attrs.length+j];
                }
                //type['id'] = type['FILE'];
                //delete type['FILE'];
                //type['Type'] = type['Path'].replace(/.*\//, '');
                entries.push(entry);
            }

            res.json({results: entries, total: count});
        }
    });
};

exports.editEntry = function(req, res) {
    var repo = req.params.repo;
    var type = req.params.type;
    var id = req.params.id;

    if (req.body.__Replicas) {
        var new_replicas = req.body.__Replicas.split(','); 
    } else {
        var new_replicas = null;
    }
    //console.log("new replicas:" + JSON.stringify(new_replicas));

    if (req.body.__ThumbData) {
        var thumbdata = req.body.__ThumbData;
    } else {
        var thumbdata = null;
    }

    var values = "";
            //id = entry_id;
    for (var attr in req.body) {
        if (attr.indexOf('__') != 0) {
            values += " " + attr + " '" + req.body[attr] + "'";
        }
    };
    //console.log("body:" + Boolean(values));


    async.waterfall([
        async.apply(AMGAexec, "selectattr /" + repo + "/Types:Path 'like(Path, " + '"%/' + type + '")' + "'"),
        function(path, callback) {
           // if (!values.trim()) {
            if (values) {
                AMGAexec('setattr ' + path + '/' + id + values, callback);
            } else {
                callback(null, "ok");
            }
                
            //} else {
            //    callback(null);
           // }
            
        },
        function (results, callback) {
            if (new_replicas) {
                // check first if the entry has previous replicas
                async.waterfall([
                    async.apply(AMGAexec, 'selectattr /' + repo + '/Replicas:FILE ' + "'ID=" + id +"'"),
                    function (replicas, callback) {

                        var old_replicas = replicas.split('\n');
                        if (old_replicas[0] == "") {
                            old_replicas.splice(0,1);
                        }
                        //console.log("old_replicas = " + JSON.stringify(old_replicas) + old_replicas.length);
                        if (old_replicas.length) {
                           
                            async.each(old_replicas, 
                                function(rep, callback) {
                                    AMGAexec('rm /' + repo + '/Replicas/' + rep, callback);
                                }, 
                                function (err) {
                                    if (!err) {
                                        callback(); //delete old_replicas e continue the waterfall 
                                    } else {
                                        callback(err);
                                    }
                                }
                            );
                        } else {
                            callback(); // just continue the waterfall
                        }
                    },
                    function (callback) {
                        // create the new replicas
                        async.each(new_replicas, function(replica, callback2) {
                            async.waterfall([
                                function(callback) {
                                    AMGAexec('sequence_next /' + repo + '/Replicas/rep', callback)
                                },
                                //async.apply(, 'sequence_next /' + repo + '/Replicas/rep'),
                                function(rep_id, callback) {
                                    AMGAexec('addentry /' + repo + '/Replicas/' + rep_id + ' ID ' + id + ' surl ' + replica + ' enabled 1', callback);
                                }
                            ], function(err, result) {
                                if (!err) {
                                    callback();
                                } else {
                                    console.log("errore nella creazione della replica" + err);
                                    callback(err);
                                }
                            });
                        });
                    },
                    function (callback) {
                        if (thumbdata) {
                            
                            AMGAexec('setattr /' + repo + "/Thumbs/" + id + " Data '" + thumbdata + "'", callback);
                        } else {
                            callback();
                        }
                    }
                ], function(err) {
                    // console.log("ci arrivo?");
                    if (err) {
                        callback(err);
                    } else {
                        callback();
                    }
                });
            } else {
                callback();
            }
        }
    ], function (err) {
        if (!err) {
            res.json({success: true});
        } else {
            res.json({success: false, error: err});
        }
    });
};

exports.deleteEntry = function(req, res) {
	var repo = req.params.repo;
	var type = req.params.type;
	var id = req.params.id;
	
	// let's look for the path of the entry
	async.waterfall([
        	async.apply(AMGAexec, "selectattr /" + repo + "/Types:Path 'like(Path, " + '"%/' + type + '")' + "'"),
		function (path, callback) {
			if (path) {
				AMGAexec('rm ' + path + '/' + id, callback);
			} else {
				callback("nopath", "path not found");
			}
                },
		function (results, callback) {
			AMGAexec('rm /' + repo + '/Replicas/ ID=' + id, callback);
		}
	], function (err, results) {
		if (!err) {
			res.json({success:true});
		} else {
			if (err == "nopath") {
				res.json({succes: false, error: results});
			} else {
				res.json({success: false, error: "entry or replica not found"});

			}
		}
	});
}

