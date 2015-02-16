
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var repo = require('./routes/repo');
var util = require('./routes/util');
//var utilities = require('./routes/utilities');
var http = require('http');
var https = require('https');
var clientCertificateAuth = require('client-certificate-auth');
var path = require('path');
var fs = require('fs');

var app = express();

var opts = {
  // Server SSL private key and certificate
  key: fs.readFileSync('/etc/grid-security/hostkey.pem'),
  cert: fs.readFileSync('/etc/grid-security/hostcert.pem'),
  // issuer/CA certificate against which the client certificate will be
  // validated. A certificate that is not signed by a provided CA will be
  // rejected at the protocol layer.
  ca: [fs.readFileSync('/etc/grid-security/certificates/INFN-CA-2006.pem'),
       fs.readFileSync('/etc/grid-security/certificates/IGCA.pem')],
  // request a certificate, but don't necessarily reject connections from
  // clients providing an untrusted or no certificate. This lets us protect only
  // certain routes, or send a helpful error message to unauthenticated clients.
  requestCert: true,
  rejectUnauthorized: true,
  //secureProtocol: 'SSLv3_method'
  secureProtocol: 'TLSv1_method'
};




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
app.use(clientCertificateAuth(checkAuth));
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
//app.post('/tiff2png', utilities.tiff2png);

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
//app.delete('/:repo/:type', repo.deleteType);
app.get('/pwd', repo.pwd);


function checkAuth(cert) {
 /*
  * allow access if certificate subject Common Name is 'Doug Prishpreed'.
  * this is one of many ways you can authorize only certain authenticated
  * certificate-holders; you might instead choose to check the certificate
  * fingerprint, or apply some sort of role-based security based on e.g. the OU
  * field of the certificate. You can also link into another layer of
  * auth or session middleware here; for instance, you might pass the subject CN
  * as a username to log the user in to your underlying authentication/session
  * management layer.
  */
  console.log(cert.subject);
  console.log(cert);
  return true;
};




http.createServer(app).listen(app.get('port'), function(){
  console.log('glibrary API server listening on port ' + app.get('port'));
});

https.createServer(opts, app).listen(4000, function() {
	console.log('gLibrary API server listening on port 4000 over HTTPS');
});

process.on('uncaughtException', function (err) {
  console.log('Caught uncaughtException: ' + err.stack);
});
