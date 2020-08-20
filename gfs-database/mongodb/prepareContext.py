#!/usr/bin/env python3

import json
import sys
import os

if __name__ == "__main__":

    for fp in sys.argv[1:]:
        base = os.path.basename(fp)

        iri = base

        if base.startswith("prefusion_dbo_"):
            iri = base.replace("_dbo_","_dbo%3A")
        elif iri.startswith("prefusion_gp_"):
            iri = base.replace("_gp_","_gp%3A")

        with open(fp, 'r') as f:
            cont_json = json.load(f)
            cont_json.update({ "this": iri })
            print(json.dumps(cont_json))

