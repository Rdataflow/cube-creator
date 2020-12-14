import { NamedNode } from 'rdf-js'
import { GraphPointer } from 'clownface'
import { Job, JobMixin, Project, Dataset } from '@cube-creator/model'
import { isPublishJob } from '@cube-creator/model/Job'
import RdfResource from '@tpluscode/rdfine'
import { ResourceStore } from '../../ResourceStore'
import { resourceStore } from '../resources'
import { schema } from '@tpluscode/rdf-ns-builders'

interface JobUpdateParams {
  resource: GraphPointer<NamedNode>
  store?: ResourceStore
}

export async function update({ resource, store = resourceStore() }: JobUpdateParams): Promise<GraphPointer> {
  const changes = RdfResource.factory.createEntity<Job>(resource, [JobMixin])
  const job = await store.getResource<Job>(resource.term)

  job.modified = changes.modified

  if (changes.actionStatus) {
    job.actionStatus = changes.actionStatus

    if (changes.actionStatus.equals(schema.CompletedActionStatus) && isPublishJob(job)) {
      const project = await store.getResource<Project>(job.project)
      project.incrementPublishedRevision()

      const dataset = await store.getResource<Dataset>(project.dataset.id)
      if (job.revision === 1) {
        dataset.setPublishedDate(job.modified)
      }
    }
  }

  if (changes.seeAlso.length) {
    job.seeAlso = changes.seeAlso
  }

  if (changes.error) {
    job.error = {
      ...changes.error.toJSON(),
      types: [schema.Thing],
    } as any
  } else {
    job.error?.pointer.deleteOut()
    job.error = undefined
  }

  await store.save()
  return job.pointer
}
