
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var repo = require('./routes/repo');
var util = require('./routes/util');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
//app.use(express.bodyParser({keepExtensions:true,uploadDir:path.join(__dirname,'/files')}));
//app.use(express.multipart());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With,X-Titanium-Id");
  next();
});

app.get('/', routes.index);

app.post('/xml2json', util.xml2json);

// List available repositories
app.get('/repositories', repo.list);
// Create a new repository
app.post('/repositories/:repo', repo.create);
// List the Types of a given repository
app.get('/:repo', repo.listTypes);
// Add a new Type to a given repository
app.post('/:repo', repo.addType);
// get Schema of a given type
app.get('/:repo/:type', repo.getSchema);
// List all the entries e its metadata of a given Type in a repository (default limit to 100)
app.get('/:repo/:type/entries', repo.listEntries);
// get Entry metadata with Replicas for a given Entry
app.get('/:repo/:type/:id', repo.getEntry);
// edit the Entry with the given id
app.put('/:repo/:type/:id', repo.editEntry);
// add a new Entry to a Type
app.post('/:repo/:type/', repo.addEntry);
// add/edit attributes to a Type
app.put('/:repo/:type', repo.editType);
// remove the Entry with the given id from Type
app.delete('/:repo/:type/:id', repo.deleteEntry);

app.get('/pwd', repo.pwd);


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
