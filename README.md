
# Cube Creator

Cube Creator is a tool to create RDF data Cubes (based on
[rdf-cube-schema](https://github.com/zazuko/rdf-cube-schema)) out of CSV files.

## Technologies

The tool is built with [Typescript](https://www.typescriptlang.org/) and is
currently composed of two main parts: a Hydra API (built with
[hydra-box](https://github.com/zazuko/hydra-box)) and a [Vue.js](https://vuejs.org/)
user interface.

## Running locally

The easiest way it to start a local dockerized environment which will run the database, API and UI, and provide set up local HTTPS endpoints for them.

1. Download and install [lando](https://github.com/lando/lando/releases)
   * it will install docker desktop if necessary
2. Run `yarn` to install packages
3. Run `lando start` inside the repo
   * Docker daemon is also started automatically

Docker containers will start and the services will be available under the these URLs:

| Service | URL                                 |
| --      | --                                  |
| API     | https://cube-creator.lndo.site/     |
| UI      | https://app.cube-creator.lndo.site/ |
| Fuseki  | https://db.cube-creator.lndo.site/  |
| Minio   | <https://s3.cube-creator.lndo.site/>  |

Lando uses its own Certificate Authority and it won't be trusted by your system.
To trust the CA, follow the steps on https://docs.lando.dev/config/security.html#trusting-the-ca
