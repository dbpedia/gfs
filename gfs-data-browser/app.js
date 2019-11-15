let express = require('express');
let expressLayouts = require('express-ejs-layouts');
let dateTime = require('node-datetime');
let conf = require('./config');
let MongoClient = require('mongodb').MongoClient;
let getJSON = require('get-json');
let util = require('util');
let hash = require('crypto').createHash

let app = express();
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.use(express.static('public'));

function logRequest(req, res, next) {
    console.info(`${dateTime.create().format('Y-m-d H:M:S')} | ${req.url} | from ${hash('sha1').update(req.connection.remoteAddress).digest('base64')} | ${req.headers["accept-language"]}`)
    next()
}
app.use(logRequest)

function logError(err, req, res, next) {
    console.error(`${dateTime.create().format('Y-m-d H:M:S')}| ${err}`)
    next()
}
app.use(logError)

var prefusionDB;

MongoClient.connect(conf.db, { useNewUrlParser: true, useUnifiedTopology: true })
.then(connection => {
    prefusionDB = connection.db(conf.db_name)
    console.log('Database connection successful')
})
.catch(err => {
    console.error('Database connection error')
})

// var MongoClient2 = require('mongodb').MongoClient;
// var connection2;
// var references = [];

// MongoClient2.connect('mongodb+srv://infoboxes_read:Read2019references@infoboxes-56nnq.mongodb.net/infoboxes?retryWrites=true&w=majority', function(err, client2) {
//     if (err) return console.log(err);
//     connection2 = client2.db('infoboxes')
// });


function foo(res, sameThing, pIRI, preFusionJSONArray) {

    var labels = new Set();
    var objects = [];
    var predicates = new Set();
    var sources = new Set();
    var contextId = null

    preFusionJSONArray.forEach( preFusionJSON => 
    {

        predicates.add(preFusionJSON['predicate']['@id'])
        if ( preFusionJSON['predicate']['@id'] == pIRI ) 
        {
            contextId = preFusionJSON['@context']
            preFusionJSON['objects'].forEach( objectProvenance => 
            {
                objectProvenance['source'].forEach( provenance => 
                {
                    sources.add(provenance['@id'])
                })
            })
            objects.push(preFusionJSON['objects'])
        }
        if ( preFusionJSON['predicate']['@id'] == conf.rdfs_label ) {
            preFusionJSON['objects'].forEach( objectProvenance => 
            {
                 labels.add(objectProvenance['object']['@value'])
            })
        }
    })

    prefusionDB.collection("context")
    .findOne( {"this" : contextId })
    .then( context => 
    {
        res.render(
            'clientbased',
            {
                labels: labels, 
                subject: sameThing['global'],
                locals: sameThing['locals'],
                predicate: pIRI,
                predicates: predicates,
                objects: objects,
                sources: sources, 
                context: context['@context'], //contextResponse, sameThingResponse ...
                util: util, conf: conf
            }
        );
    })
    .catch( err => {
        console.error(err)
    })
}

app.get('/', function(req, res) {

    var sIRI = req.query.s;
    var pIRI = req.query.p;
    var src = req.query.src;

    if( sIRI == null ) sIRI = conf.init_subject;
    if( pIRI == null ) pIRI = conf.init_predicate;
    if( src == null  ) src = "general";

    sIRI = replaceNamespace(sIRI)

    getJSON(conf.same_thing+encodeURIComponent(sIRI)).then(
        sameThing => {
            prefusionDB.collection(conf.coll_provenance)
            .find( {"subject.@id" : sameThing['global'] })
            .toArray()
            .then(preFusionJSONArray => foo(res,sameThing,pIRI,preFusionJSONArray)).catch( queryError => console.error(queryError) )
        }
    ).catch(
        error => {
            console.log(error)
            prefusionDB.collection(conf.coll_provenance)
            .find({"subject.@id" : sIRI })
            .toArray()
            .then(
                queryResponse => {
                    res.render('clientbased',{preFusionJSONArray: queryResponse, subject: sIRI, predicate: pIRI,
                        source: src, util: util, prefusionDB: prefusionDB, conf: conf, locals: [sIRI] });
                }
            ).catch(
                queryError => {
                    console.error(queryError)
                }
            )
        }
    );
});

function foobar(preFusionJSONArray) {
    preFusionJSONArray.forEach( preFusionJSON => {
        predicates.add(preFusionJSON['predicate']['@id'])
        if ( preFusionJSON['predicate']['@id'] == predicate ) 
        {
            contextId = preFusionJSON['@context']
            preFusionJSON['objects'].forEach( objectProvenance => 
            {
                objectProvenance['source'].forEach( provenance => 
                {
                    sources.add(source['@id'])
                })
            })
            objects.push(preFusionJSON['objects'])
        }
        if ( preFusionJSON['predicate']['@id'] == conf.rdfs_label ) {
            preFusionJSON['objects'].forEach( objectProvenance => 
            {
                 labels.add(objectProvenance['object']['@value'])
            })
        }
    })
}
function sendContextRequest() {

}

function replaceNamespace(iri) {
    var sIRI = iri

    if ( sIRI.includes("wikipedia.org/wiki/") ) {
        sIRI = sIRI.replace("https://","http://");
        sIRI = sIRI.replace("http://en.","http://");
        sIRI = sIRI.replace("wikipedia.org/wiki/","dbpedia.org/resource/");
    }

    if ( sIRI.includes("wikidata.org/wiki/") ) {
        sIRI = sIRI.replace("wikidata.org/wiki/", "wikidata.org/entity/");
        sIRI = sIRI.replace("https://","http://");
        sIRI = sIRI.split("?")[0]
    }
    return sIRI
}

app.get('/label', function (req,res) {

    var s = req.query.s;
    var p = conf.init_predicate;

    if( s == null ) s = conf.init_subject;

    prefusionDB.collection(conf.coll_provenance)
        .findOne( { "subject.@id" : s, "predicate.@id" : p },{ "projection": { "objects.object": 1, _id: 0 }})
        .then( queryResponse => { 
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(queryResponse));
        })
        .catch( err => {
            console.error(err);
        })
});

app.get('/context', function(req, res) {

    prefusionDB.collection("context")
    .findOne( {"this" : req.query.id })
    .then( queryResponse => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(queryResponse));
    })
    .catch( err => {
        console.error(err)
    })
});


// app.get('/raw', function(req, res) {

//     var s = req.query.s;
//     var p = req.query.p;
//     var src = req.query.src;

//     if( s == null ) s = conf.default_subject;
//     if( p == null ) p = conf.default_predicate;
//     if( src == null  ) src = "general";

//     var locals = [s];

//     getJSON(conf.id_management+encodeURIComponent(s)).then( function (idResponse) {
//         console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+s+"\t"+p);
//         s = idResponse['global'];
//         locals = idResponse['locals'];
//     }).catch(function (idError) {
//         console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+s+"\t"+p+"\tunmanaged id");
//     });

//     connection.collection(conf.collection).find( {"subject.@id" : s }).toArray(function (mongoError, mongoResponse) {
//         res.send(JSON.stringify({jarray: mongoResponse, subject: s, predicate: p, source: src}));
//     });
// });

/**
 * Infobox reference part
 */

 // app.get('/infobox', function(req, res) {

//     var s = req.query.s;
//     var s1 = req.query.s;
//     var p = req.query.p;
//     var src = req.query.src;

//     if( s == null ) s = conf.default_subject;
//     if( p == null ) p = conf.default_predicate;
//     if( src == null  ) src = "general";

//     var original = s;
//     var locals;

//     //TODO logging
//     if ( s.includes("wikipedia.org/wiki/") ) {
//         s = s.replace("https://","http://");
//         s = s.replace("http://en.","http://");
//         s = s.replace("wikipedia.org/wiki/","dbpedia.org/resource/");
//     }

//     if ( s.includes("wikidata.org/wiki/") ) {
//         s = s.replace("wikidata.org/wiki/", "wikidata.org/entity/");
//         s = s.replace("https://","http://");
//         s = s.split("?")[0]
//     }
    
//     getJSON(conf.id_management+encodeURIComponent(s)).then( function (idResponse) {
//         var idglobal = idResponse['global'].replace('https://global.dbpedia.org/id/','');
        
//         connection2.collection('infoboxes').find( {"_id" : idglobal }).toArray(function (mongoError, mongoResponse) {
//             //console.log(mongoResponse[0]);
//         references=mongoResponse[0];
//         });
        

//         if( s.startsWith("https://global.dbpedia")) {
//             console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+original+"\t"+p);
//         } else {
//             console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+original+">>"+idResponse['global']+"\t"+p);
//         }

//         connection.collection(conf.collection).find( {"subject.@id" : idResponse['global'] }).toArray(function (mongoError, mongoResponse) {
//             res.render('clientbased2',{jarray: mongoResponse, subject: idResponse['global'], predicate: p,
//                 source: src, util: util, conf: conf, locals: idResponse['locals'], references: references });
//         })

//     }).catch(function (idError) {
//         console.log("[ "+dateTime.create().format('Y-m-d H:M:S')+" ]\t/\t"+original+"\t"+p+"\tunmanaged id");
    
//         connection.collection(conf.collection).find( {"subject.@id" : s }).toArray(function (mongoError, mongoResponse) {
//             res.render('clientbased2',{jarray: mongoResponse, subject: s, predicate: p,
//                 source: src, util: util, conf: conf, locals: [s], references: references });
//         })
//     });


// });

module.exports = app;
