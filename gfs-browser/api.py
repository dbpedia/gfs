#!/usr/bin/env python3
from flask import Flask, jsonify, request, Response, send_from_directory
from flask_swagger import swagger
from flask_cors import CORS
from flask_accept import accept, accept_fallback
import json
import pymongo
import requests
from rdflib import Graph, plugin, URIRef
import urllib.parse
from urllib.error import HTTPError
from functools import reduce
from rdflib.namespace import OWL

IP = '0.0.0.0'
PORT = 9005
#MONGODB_URI = 'mongodb://root:gfsroot@dbpedia.informatik.uni-leipzig.de:8969/admin'
MONGODB_URI = 'mongodb://root:root2020@tools.dbpedia.org:10201/admin'
SAMETHING_URI = "https://dbpedia.link/same-thing/lookup/"
SAMEPROP_URI = "https://global.dbpedia.org/same-prop/lookup/"

myclient = pymongo.MongoClient(MONGODB_URI)
mydb = myclient["prefusion"]
provenanceCol = mydb["provenance"]
contextCol = mydb["context"]

app = Flask(__name__,static_url_path='',static_folder='./')
CORS(app)

#default_s = 'https://dbpedia.link/id/4KKSo'
default_s = 'https://dbpedia.link/id/2wvzs'

@app.route('/', methods=['GET'])
def root():
    return app.send_static_file('index.html')

@app.route("/spec")
def spec():
    html = """
    <!DOCTYPE html>
    <html>
    <head>
    <title>ReDoc</title>
    <!-- needed for adaptive design -->
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <!--
    ReDoc doesn't change outer page styles
    -->
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
    </head>
    <body>
    <redoc spec-url='/spec-json'></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"> </script>
    </body>
    </html>
    """
    return Response(html,mimetype='text/html')

@app.route("/spec-json")
def spec_json():                 
    swag = swagger(app)
    swag['info']['version'] = "1.0"
    swag['info']['title'] = "Global Fact Browser API"
    return jsonify(swag) 

@app.route("/lookup", methods=['GET'])
@accept_fallback
def lookup():
    """
    Info populated place for given iri
    ---
    """
    subjectURI = request.args.get('s',default_s) or default_s
    cursor = provenanceCol.find({ "subject.@id" : subjectURI},{"_id": 0})

    arr = []
    
    for doc in cursor:
        
        arr.append(
            {
                's': doc['subject']['@id'], 
                'p': doc['predicate']['@id'],
                'o': doc['objects'],
                'c': doc['@context']
            }
        )

    return Response(json.dumps(arr),mimetype='application/json')

@app.route("/label", methods=['GET'])
def label():
    """
    Info populated place for given iri
    ---
    """
    subjectURI = request.args.get('s',default_s)
    cursor = provenanceCol.find({ "subject.@id" : subjectURI, 'predicate.@id' : 'http://www.w3.org/2000/01/rdf-schema#label'},{ "objects.object" :1, "_id": 0 })

    arr = [provObj['object'] for doc in cursor for provObj in doc['objects']]
        
    return Response(json.dumps(arr),mimetype='application/json')

@app.route("/context", methods=['GET'])
def context():
    iri = request.args.get('iri','')
    name = request.args.get('name','')

    doc = contextCol.find_one({'this': iri},{'_id': 0}) or {}
    label_local = name.split(':')
    prefix_iri = doc.get('@context',{}).get(label_local[0],None)
    
    if prefix_iri and len(label_local) == 2:
        doc.update({'resolved': prefix_iri+label_local[1]})
        return Response(json.dumps(doc),mimetype='application/json')
    else:
        return Response(json.dumps(doc),mimetype='application/json')

def manageID(iri):
    response = requests.get(
        SAMETHING_URI,
        params={'uri': iri},
    ).json()
    return response['global']

@app.route("/lookup", methods=['GET'])
@lookup.support("text/turtle")
def rdf():
    """
    Info populated place for given iri as rdf
    ---
    """
    subjectURI = request.args.get('s',default_s) or default_s
    cursor = provenanceCol.find({ "subject.@id" : subjectURI},{"_id": 0})

    arr = []
    
    for doc in cursor:
        contextIRI = doc['@context']
        context = contextCol.find_one({'this': contextIRI})['@context']
        
        doc.update({'@context': context})
        jsonString = json.dumps(doc)

        g = Graph().parse(data=jsonString, format='json-ld')
        arr.append(g)
    
    gAll = reduce(lambda x,y: x+y, arr)


    return Response(gAll.serialize(format='turtle'),mimetype='text/turtle')

@app.route("/idAsRDF", methods=['GET'])
def idAsRDF():
    uri = request.args.get('uri','')
    urlString = SAMETHING_URI+"?uri="+uri
    print(urlString)

    try:
        with urllib.request.urlopen(urlString) as url:
            data = json.loads(url.read().decode())
            globalUri = data['global']
            g = Graph()
            g.bind('owl', OWL)
            for local in data['locals']:
                g.add((URIRef(globalUri),OWL.sameAs,URIRef(local)))
            
        return Response(g.serialize(format='turtle'),mimetype='text/turtle')

    except HTTPError:
        return Response(status=404 ,mimetype='text/turtle')


@app.route("/propAsRDF")
def propAsRDF():    
    uri = request.args.get('uri','')
    urlString = SAMEPROP_URI+"?uri="+uri

    try:
        with urllib.request.urlopen(urlString) as url:
            data = json.loads(url.read().decode())
            globalUri = str(data['global']).replace("/id/","/property/")
            g = Graph()
            g.bind('owl', OWL)
            for local in data['locals']:
                g.add((URIRef(globalUri),OWL.equivalentProperty,URIRef(local)))
                
            return Response(g.serialize(format='turtle'),mimetype='text/turtle')

    except HTTPError:
        return Response(status=404 ,mimetype='text/turtle')

if __name__ == "__main__":
    app.run(host=IP, port=PORT)
