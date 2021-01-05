import { ResourceMixin } from '@rdfine/rdfs'
import { CsvMapping, CsvMappingMixin } from './CsvMapping'
import { Constructor, namespace, property, RdfResource } from '@tpluscode/rdfine'
import { Mixin } from '@tpluscode/rdfine/lib/ResourceFactory'
import { cc } from '@cube-creator/core/namespace'
import { NamedNode } from 'rdf-js'
import { dcterms, schema } from '@tpluscode/rdf-ns-builders'
import type { Organization } from '@rdfine/schema'
import { initializer } from './lib/initializer'
import { childResource } from './lib/resourceIdentifiers'
import { Link } from './lib/Link'
import type { Collection } from '@rdfine/hydra'
import { JobCollection } from './Job'
import { Dataset } from './Dataset'

export interface Project extends RdfResource {
  csvMapping?: CsvMapping
  dataset: Link<Dataset>
  cubeGraph: NamedNode
  creator: NamedNode
  label: string
  jobCollection: Link<JobCollection>
  cubeIdentifier: string
  maintainer: Organization
  publishedRevision: number
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProjectsCollection extends Collection<Project> {

}

export function ProjectMixin<Base extends Constructor>(base: Base): Mixin {
  @namespace(cc)
  class Impl extends ResourceMixin(base) implements Partial<Project> {
    @property.resource({ as: [CsvMappingMixin] })
    csvMapping?: CsvMapping

    @property.resource({ initial: childResource('dataset') })
    dataset!: Link<Dataset>

    @property({ initial: childResource('cube-data') })
    cubeGraph!: NamedNode

    @property.literal()
    cubeIdentifier!: string

    @property.resource({ path: schema.maintainer })
    maintainer!: Organization

    @property.literal({ path: cc.latestPublishedRevision, type: Number })
    publishedRevision?: number

    @property({ path: dcterms.creator })
    creator!: NamedNode

    @property.resource({ path: cc.jobCollection })
    jobCollection!: Link<JobCollection>
  }

  return Impl
}

ProjectMixin.appliesTo = cc.CubeProject

type MandatoryFields = 'creator' | 'label' | 'maintainer' | 'cubeIdentifier'

export const create = initializer<Project, MandatoryFields>(ProjectMixin)
