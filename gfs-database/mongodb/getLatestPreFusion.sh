#!/usr/bin/env bash

QUERY="
PREFIX dataid: <http://dataid.dbpedia.org/ns/core#>
PREFIX dct:    <http://purl.org/dc/terms/>
PREFIX dcat:   <http://www.w3.org/ns/dcat#>

SELECT DISTINCT ?downloadURL WHERE {
  VALUES ?artifact
  {
    <https://databus.dbpedia.org/vehnem/flexifusion/prefusion>
  }
  ?dataset dataid:artifact ?artifact ;
           dct:hasVersion ?maxVersion ;
           dcat:distribution/dcat:downloadURL ?downloadURL .
  {
    SELECT DISTINCT ?artifact (MAX(?version) as ?maxVersion) {
      ?dataset dataid:artifact ?artifact ;
               dct:hasVersion ?version .
    }
  }
}
"

curl -s \
  --data-urlencode "format=text/tab-separated-values" \
  --data-urlencode "query=$QUERY"\
  https://databus.dbpedia.org/repo/sparql \
  | grep -o '[^"]*' | tail -n +2 \
