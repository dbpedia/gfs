# GFS Data Browser

* GFS Project: https://meta.wikimedia.org/wiki/Grants:Project/DBpedia/GlobalFactSyncRE
* Deployed at https://global.dbpedia.org 
* Prefusion([FlexiFusion](https://svn.aksw.org/papers/2019/ISWC_FlexiFusion/public.pdf)) based viewer for possible inconsistencies in Wikipedia, Wikidata and "Your Data".

## Usage

Use any URI from Wikipedia/DBpedia or Wikidata as `?s` parameter:
https://global.dbpedia.org/?s=http://en.wikipedia.org/wiki/Eiffel_Tower 

## Install (using our database)
 
 
> Prerequisites [node.js & npm](https://nodejs.org/en/)
  (e.g Debian/Ubunutu `sudo apt-get install nodejs`)

Install project dependencies with

```
npm install
```

Change application configuration in `config.js`

```
module.exports = {
    expose_port: "9005",

    mongo_url: "mongodb://readonly:gfs@88.99.242.78:8989/prefusion",
    database_name: "prefusion",
    collection: "provenance",

    id_management: "https://global.dbpedia.org/same-thing/lookup/?uri=",

    default_subject: "https://global.dbpedia.org/id/4KKSo",
    default_predicate: "http://www.w3.org/2000/01/rdf-schema#label"
    
    //DEPRECATED
    preference: "wikidata.dbpedia.org,en.dbpedia.org,de.dbpedia.org,fr.dbpedia.org,nl.dbpedia.org,sv.dbpedia.org",
};
```

Run 

```
bin/www.js
```

and then visit [9005](http://localhost:9005)


## Routing

| Route | Params | Description |
|---|---|---|
| / | ?s=IRI <br> ?p=IRI | Lookup subject predicate pair |
| /raw | ?s=IRI <br> ?p=IRI | Same as / but returns JSON |
| /label | ?s=IRI | Get rdfs:label for Resource |


# TODO

    "mongoose": "5.7.10"