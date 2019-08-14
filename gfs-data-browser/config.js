module.exports = {
    expose_port: "9005",

    mongo_url: "mongodb://readonly:gfs@88.99.242.78:8989/prefusion",
    database_name: "prefusion",
    collection: "provenance",

    id_management: "https://global.dbpedia.org/same-thing/lookup/?uri=",

    preference: "wikidata.dbpedia.org,en.dbpedia.org,de.dbpedia.org,fr.dbpedia.org,nl.dbpedia.org,sv.dbpedia.org",

    default_subject: "https://global.dbpedia.org/id/4KKSo",
    default_predicate: "http://www.w3.org/2000/01/rdf-schema#label"
};
