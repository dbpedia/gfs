module.exports = {

    expose_port: "9005",

    db: "mongodb://root:gfs2019*@dbpedia.informatik.uni-leipzig.de:8989/admin",
    db_name: "prefusion",

    coll_provenance: "provenance",
    coll_context: "context",

    same_thing: "https://global.dbpedia.org/same-thing/lookup/?uri=",
    same_prop: "",

    rdfs_label: "http://www.w3.org/2000/01/rdf-schema#label",
    rdf_type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    
    init_subject: "https://global.dbpedia.org/id/4KKSo",
    init_predicate: "http://www.w3.org/2000/01/rdf-schema#label",

    group_alias: {
        "https://databus.dbpedia.org/dbpedia/generic/" : "wikipedia",
        "https://databus.dbpedia.org/dbpedia/mappings/" : "wikipedia",
        "https://databus.dbpedia.org/dbpedia/wikidata/" : "wikidata",
        "https://databus.dbpedia.org/vehnem/dnb/" : "dnb",
        "https://databus.dbpedia.org/vehnem/musicbrainz/" : "musicbrainz",
        "https://databus.dbpedia.org/kurzum/cleaned-data/": "geonames"
    }

    // TODO  group: "https://databus.dbpedia.org/dbpedia/generic/", alias:  "wikidata", ico : ".ico"

//    preference: "wikidata.dbpedia.org,en.dbpedia.org,de.dbpedia.org,fr.dbpedia.org,nl.dbpedia.org,sv.dbpedia.org",
};
