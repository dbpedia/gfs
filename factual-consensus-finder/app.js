var express = require('express');
// var createError = require('http-errors');
// var path = require('path');
// var cookieParser = require('cookie-parser');
// var logger = require('morgan');
var expressLayouts = require('express-ejs-layouts');
// var conf = require('config')
// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');
var dateTime = require('node-datetime');

var conf = require('./config');
var MongoClient = require('mongodb').MongoClient;
var util = require('util');
var connection;

var getJSON = require('get-json');

var app = express();

var sourceList = conf.preference.split(",");
sourceList.push("general");
sourceList.sort();

app.use(expressLayouts);
//app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static('public'));


MongoClient.connect(conf.mongo_url, function(err, client) {

    if (err) return console.log(err);

    connection = client.db(conf.database_name)
});

app.get('/', function(req, res) {

    var s = req.query.s;
    var p = req.query.p;
    var src = req.query.src;

    if( s == null ) s = conf.default_subject;
    if( p == null ) p = conf.default_predicate;
    if( src == null  ) src = "general";

    var original = s;
    var locals;

    //TODO logging
    if ( s.includes("wikipedia.org/wiki/") ) {
        s = s.replace("https://","http://");
        s = s.replace("http://en.","http://");
        s = s.replace("wikipedia.org/wiki/","dbpedia.org/resource/");
    }

    getJSON(conf.id_management+s).then( function (idResponse) {

        if( s.startsWith("https://global.dbpedia")) {
            console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+original+"\t"+p);
        } else {
            console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+original+">>"+idResponse['global']+"\t"+p);
        }

        connection.collection(conf.collection).find( {"subject.@id" : idResponse['global'] }).toArray(function (mongoError, mongoResponse) {
            res.render('clientbased',{jarray: mongoResponse, subject: idResponse['global'], predicate: p,
                source: src, util: util, conf: conf, locals: idResponse['locals'] });
        })

    }).catch(function (idError) {
        console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+original+"\t"+p+"\tunmanaged id");

        connection.collection(conf.collection).find( {"subject.@id" : s }).toArray(function (mongoError, mongoResponse) {
            res.render('clientbased',{jarray: mongoResponse, subject: s, predicate: p,
                source: src, util: util, conf: conf, locals: [s] });
        })
    });


});


app.get('/raw', function(req, res) {

    var s = req.query.s;
    var p = req.query.p;
    var src = req.query.src;

    if( s == null ) s = conf.default_subject;
    if( p == null ) p = conf.default_predicate;
    if( src == null  ) src = "general";

    var locals = [s];

    getJSON(conf.id_management+s).then( function (idResponse) {
        console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+s+"\t"+p);
        s = idResponse['global'];
        locals = idResponse['locals'];
    }).catch(function (idError) {
        console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+s+"\t"+p+"\tunmanaged id");
    });

    connection.collection(conf.collection).find( {"subject.@id" : s }).toArray(function (mongoError, mongoResponse) {
        res.send(JSON.stringify({jarray: mongoResponse, subject: s, predicate: p, source: src}));
    });
});

app.get('/label', function (req,res) {

    var s = req.query.s;

    //TODO better conf
    var p = conf.default_predicate;

    if( s == null ) s = conf.default_subject;

    console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/label\t"+s);

    connection.collection(conf.collection)
        .find( { "subject.@id" : s, "predicate.@id" : p } )
        .project( { "objects.object.@value" :1, _id: 0 } )
        .toArray(function (mongoError, mongoResponse) {
            res.send(JSON.stringify(mongoResponse));
        })
});


module.exports = app;
