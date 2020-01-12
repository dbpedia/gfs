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
var request = require("request");


var conf = require('./config');
var MongoClient = require('mongodb').MongoClient;
var MongoClient2 = require('mongodb').MongoClient;
var util = require('util');
var connection;
var connection2;
var references = [];

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

MongoClient2.connect('mongodb+srv://infoboxes_read:Read2019references@infoboxes-56nnq.mongodb.net/infoboxes?retryWrites=true&w=majority', function(err, client2) {

    if (err) return console.log(err);

    connection2 = client2.db('infoboxes')
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

    if ( s.includes("wikidata.org/wiki/") ) {
        s = s.replace("wikidata.org/wiki/", "wikidata.org/entity/");
        s = s.replace("https://","http://");
        s = s.split("?")[0]
    }

    getJSON(conf.id_management+encodeURIComponent(s)).then( function (idResponse) {

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

    getJSON(conf.id_management+encodeURIComponent(s)).then( function (idResponse) {
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


app.get('/infobox', function(req, res) {
    var wikirank = {"result":{"en":{"name":""}}};
    var s = req.query.s;
    var s1 = req.query.s;
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

    if ( s.includes("wikidata.org/wiki/") ) {
        s = s.replace("wikidata.org/wiki/", "wikidata.org/entity/");
        s = s.replace("https://","http://");
        s = s.split("?")[0]
    }


    
      
    
    getJSON(conf.id_management+encodeURIComponent(s)).then( function (idResponse) {
        var idglobal = idResponse['global'].replace('https://global.dbpedia.org/id/','');
        references=0;
        connection2.collection('infoboxes').find( {"_id" : idglobal }).toArray(function (mongoError, mongoResponse) {
            //console.log(JSON.stringify(mongoResponse[0]));
        references=mongoResponse[0];
        });
        

        if( s.startsWith("https://global.dbpedia")) {
            console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+original+"\t"+p);
        } else {
            console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+original+">>"+idResponse['global']+"\t"+p);
        }

        connection.collection(conf.collection).find( {"subject.@id" : idResponse['global'] }).toArray(function (mongoError, mongoResponse) {
            
            
        if (references==undefined) {console.log("None"); references="0";}    
 
var engname="";
var wikiname="";         
idResponse['locals'].forEach(function(link) {
    //console.log(link);
    if (link.includes("dbpedia.org/resource")) { if ((link.includes("//pl.")) || (link.includes("//de.")) || (link.includes("//fr.")) || (link.includes("//de.")) || (link.includes("//ru.")) || (link.includes("//it.")) || (link.includes("//es.")) || (link.includes("//sv.")) || (link.includes("//nl.")) || (link.includes("//dbpedia"))) {
    wikiname=link.replace("//dbpedia.org/resource/","//en.wikipedia.org/wiki/").replace("dbpedia.org/resource/","wikipedia.org/wiki/").replace("http://","https://");
        console.log(wikiname)
request({
    url: "http://dbpedia.informatik.uni-leipzig.de:8111/infobox/references?article="+wikiname+"&format=json&dbpedia",
    json: true
}, function (error, response, body2) {

    if (!error && response.statusCode === 200) {
        console.log(body2);
                                                    
    }});
                                                    
                                                     } }
    if (link.includes("/dbpedia.org")) {engname=link.replace("http://dbpedia.org/resource/","");
                                       
var wikirankurl = "https://api.wikirank.net/api.php?lang=en&name="+encodeURIComponent(engname);                                       
request({
    url: wikirankurl,
    json: true
}, function (error, response, body) {

    if (!error && response.statusCode === 200) {
        wikirank=body;

res.render('clientbased2',{jarray: mongoResponse, subject: idResponse['global'], predicate: p,
                source: src, util: util, conf: conf, locals: idResponse['locals'], references: references, wikirank: wikirank });        
        
        

        
        
    }
});
                                        
                                        
};
});
 


        })

    }).catch(function (idError) {
        console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+original+"\t"+p+"\tunmanaged id");
        
        connection.collection(conf.collection).find( {"subject.@id" : s }).toArray(function (mongoError, mongoResponse) {
            res.render('clientbased2',{jarray: mongoResponse, subject: s, predicate: p,
                source: src, util: util, conf: conf, locals: [s], references: references, wikirank: wikirank });
        })
    });


});


module.exports = app;
