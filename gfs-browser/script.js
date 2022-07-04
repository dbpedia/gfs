//import VueRouter from 'vue-router';
//Vue.use(VueRouter);

var router = new VueRouter({
    mode: 'history',
    routes: []
})

Vue.component('v-select', VueSelect.VueSelect);

var myApp = new Vue({
    router,
    el: '#parent',
    data: {
        api: "/",
        sameThing: "/same-thing/lookup/?uri=",
        labels: [],
        prefusion: [],
        subject: 'https://global.dbpedia.org/id/2wvzs',
        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
        context: {},
        source: 'general',
        changed: false,
        labelsLang: 'en',
        targetLabelsLang: 'en',
        targetLabels: { 'generla': 'general'},
        rawTableData: [],
        tableData: [],
        aliasMap: {
            "https://databus.dbpedia.org/dbpedia/generic/" : "wikipedia",
            "https://databus.dbpedia.org/dbpedia/mappings/" : "wikipedia",
            "https://databus.dbpedia.org/dbpedia/wikidata/" : "wikidata",
            "https://databus.dbpedia.org/jj-author/dnb/" : "dnb",
            "https://databus.dbpedia.org/jj-author/kb/" : "kb",
            "https://databus.dbpedia.org/vehnem/musicbrainz/" : "musicbrainz",
            "https://databus.dbpedia.org/kurzum/cleaned-data/": "geonames"
        }
    },
    created() {
        vm = this
        vm.subject = vm.$route.query.s || vm.subject
        vm.predicate = vm.$route.query.p || vm.predicate
        vm.$http.get(vm.sameThing+encodeURIComponent(vm.subject)).then(function(data) {    
            vm.subject = data.body["global"] || vm.subject
            vm.loadPrefusion()
        }, function (error) {
            console.log('failed same thing service')
            vm.loadPrefusion()
	    //vm.prepareTable()
        });
    },
    mounted() {
        // called when visible (hidden)
    },
    computed: {
        predicateCollection() {
            vm = this
            return vm.prefusion.map( function (doc) {
                return doc['p']
            });
        },
        sourceCollection() {
            vm = this
            nameSet = new Set()
            vm.prefusion.filter(function (doc) {
                return doc['p'] === vm.predicate;
            }).forEach( doc => {
                doc['o'].forEach( provObj => {
                    provObj['prov'].forEach( prov => {
                        nameSet.add(prov['src']['@id'])
                    })
                });
            });
            sourceSet = new Set()
            Array.from(nameSet).forEach( name => sourceSet.add(vm.resolveSource(name)['alias'].replace('wiki_',''))) //TODO wiki vaiable?
            sourceSet.add('general')
            return Array.from(sourceSet).sort(function (a,b) {return (a === b) ? 0 : ((a > b) ? 1 : -1);});
        },
	newTable() {
		vm = this
		return vm.prefusion.map( function (doc) {
			sourceSet = new Set()
			_ops = doc['o'].sort( function (a,b) {
                av = a['object']['@language'] || a['object']['@value'] || a['object']['@id']
                bv = b['object']['@language'] || b['object']['@value'] || b['object']['@id']
                return (av === bv) ? 0 : ((av > bv) ? 1 : -1);
            }).sort( function (a,b) {
                av = a['prov'].length
                bv = b['prov'].length
                return (av === bv) ? 0 : ((av > bv) ? -1 : 1);
            }).map( function (doc_o) {
				values = vm.renderValue(doc_o['object'])
				sources = doc_o['prov'].map( function (prov) {
					source = prov['s_prov']['@id']  
					sourceSet.add(source)
					return '<a target="_blank" href="'+source+'">'+source+'</a>'
				})
				return {
					'values': values,
					'prov': sources.join(" | ")
				};
			})
			valuesCount = _ops.length
			sourceCount = sourceSet.size
			_pre = '<a target="_blank" href="'+doc['p']+'">'+doc['p']+'</a>'
			_pre_stats = "<strong>"+doc['p']+"</strong>: "+valuesCount+" value(s), "+sourceCount+" resource(s)"
			return {'pre_stats': _pre_stats, 'pre': _pre, 'ops': _ops};
		});
	},
    },
    methods: {
        loadPrefusion() {
            vm = this
            vm.$http.get(vm.api+'lookup'+'?s='+encodeURI(vm.subject)).then(function(data) {
                vm.prefusion = data.body || {};
		console.log(data.body);
                labels = new Set(vm.prefusion.filter( function (doc) {
                    return doc['p'] === "http://www.w3.org/2000/01/rdf-schema#label"
                }).map(function (doc) {
                    return doc['o'].map( function (provObj) {
                        if ( vm.labelsLang === provObj['object']['@language'])
                            return `<strong>${provObj['object']['@value']}</strong>`
                        else
                            return provObj['object']['@value']
                    });
                }).flat(1));
                vm.labels = Array.from(labels)
                //vm.changedPredicate()
            });
        },
	renderPropertyStats(p) {
		return "<h3>"+p+"</h3>";
	},
        renderValue(provObjValue) {
            vm = this
            if (provObjValue['@language']) {
                return provObjValue['@value'] + ' @<strong>' + provObjValue['@language'] + '</strong>' 
            } 
            else if (provObjValue['@value']) { 
                return provObjValue['@value']
            } 
            else {
                return `<a href="./?s=${provObjValue['@id']}">${vm.targetLabels[provObjValue['@id']] || provObjValue['@id']}</a>`
            }
        },
	renderValues(provObjValues) {
		vm = this
		return provObjValues.map( function (provObj) {
			return vm.renderValue(provObj['object']);
		}).join(" ");
	},
        renderSource(provObjProvenance, context) {
            sourceArr = provObjProvenance.map(function (provenance) {
                meta = vm.resolveSource(provenance['src']['@id'], context)
		    s_prov = provenance.hasOwnProperty('s_prov') ? provenance['s_prov']['@id'] : vm.subject
                return { 
                    'alias': meta['alias'],
                    'fileid' : meta['fileid'],
                    's_prov': s_prov
                };
            }).map( function (meta) {
                if (meta.alias.startsWith('wiki_')) {
                    return `${meta.alias.replace('wiki_','')} `
                        + `<a href="${meta.s_prov.replace('dbpedia.org/resource','wikipedia.org/wiki')}" target="_blank">`
                        + `<image class="iconlinks" src="images/wikipedia.ico"></image></a>`
                        + `<a href="${meta.s_prov}" target="_blank"><image class="iconlinks" src="images/dbpedia.ico"></image></a>`
                        + `<a href="${meta.fileid}" target="_blank"><image class="iconlinks" src="images/databus.ico"></image></a>`
                } else {
                    return `${meta.alias} `
                        + `<a href="${meta.s_prov}" target="_blank"><image class="iconlinks" src="images/${meta.alias}.ico"></image></a>`
                        + `<a href="${meta.fileid}" target="_blank"><image class="iconlinks" src="images/databus.ico"></image></a>`
                }
            })
	    return Array.from(new Set(sourceArr)).sort( function (a,b) {
                //console.log(a)
		av = a
                bv = b
                return (av === bv) ? 0 : ((av > bv) ? 1 : -1);
            }).join(' | ')
        },
        resolveSource(name, context) {
	    console.log(context.get)
            vm = this
            label_local = name.split(':')
            iri = context[label_local[0]] || ''
	    console.log(iri)
            baseiri = iri.split('/',6).slice(0,5).join('/')+'/'
            alias = vm.aliasMap[baseiri] || 'placeholder'
            if(alias === 'wikipedia' ) {
                match = label_local[1].match(/lang=([a-z]*).*/)
                alias = match && match.length > 1 ? 'wiki_'+match[1] : 'wiki_commons'
            }
            fileid = iri+label_local[1]
            return { 'alias': alias, 'fileid': fileid }
        },
        resolveLabels(iri, lang) {
            vm = this
            vm.$http.get(vm.api+'label'+'?s='+encodeURI(iri)).then(function(data) {    
                labelsJSON = data.body || {}
                targetLabels = labelsJSON.flatMap( function (labelObj) {
                    if(!lang)
                        return [labelObj['@value']] + (labelObj['@language'] ? ` @${labelObj['@language']}` : '')
                    else if (lang === labelObj['@language'])
                        return [labelObj['@value']] + (labelObj['@language'] ? ` @${labelObj['@language']}` : '')
                    else 
                        return []
                }).join(' | ');
                if(lang.length >= 0)vm.targetLabels[iri] = targetLabels
                vm.changed = !vm.changed
            });
            return iri  
        },
	resolveContext(p) {
                return vm.$http.get(vm.api+'context'+'?iri='+encodeURIComponent(p)).then(function(data) {
			context = data.body["@context"] || {};
			return context;
                });
	},
        changedPredicate() {
            vm = this
		//vm.rawTableData = vm.prefusion.	
	    vm.rawTableData = vm.prefusion.filter(function (doc) {
                return doc['p'] === vm.predicate;
		//return true;
            }).map( function (doc){
		console.log(doc['p'])
                vm.$http.get(vm.api+'context'+'?iri='+encodeURIComponent(doc['p'])).then(function(data) {
		    //xx = data.body["@context"] || {};
                    vm.context = data.body["@context"] || {};
                    vm.changed = !vm.changed
                });
                doc['o'].filter(function (provObj) {
                    return provObj['object']['@id']
                }).forEach( provObj => vm.resolveLabels(provObj['object']['@id'],vm.targetLabelsLang))
                return doc['o']
            }).flat(1).sort( function (a,b) {
                av = a['object']['@language'] || a['object']['@value'] || a['object']['@id']
                bv = b['object']['@language'] || b['object']['@value'] || b['object']['@id']
                return (av === bv) ? 0 : ((av > bv) ? 1 : -1);
            }).sort( function (a,b) {
                av = a['prov'].length
                bv = b['prov'].length
                return (av === bv) ? 0 : ((av > bv) ? -1 : 1);
            });	
        },
        submit(event) {
            vm = this
            window.location.href = `?s=${encodeURIComponent(event.target.value)}`
        }
    },
    watch: {
	/*
        predicate: function() {
            vm = this
            console.log(vm.predicate)
            history.pushState("", document.title, window.location.href.split('?')[0]+'?s='+encodeURIComponent(vm.subject)+'&p='+encodeURIComponent(vm.predicate))
            vm.changedPredicate()
        },
        changed: function() {
            vm = this
            vm.tableData = vm.rawTableData.map( function (provObj) {
                return {'propertyValue': '<a target="_blank" href="'+vm.predicate+'">'+vm.predicate+'</a>', 'valueHTML': vm.renderValue(provObj['object']), 'sourcesHTML': vm.renderSource(provObj['prov'])}
            })
        },*/
        // targetLabels: function() {
        //     vm = this
        //     vm.tableData = vm.rawTableData.map( function (provObj) {
        //         return {'valueHTML': vm.renderValue(provObj['object']), 'sourcesHTML': vm.renderSource(provObj['prov'])}
        //     })
        // }
    }
})
