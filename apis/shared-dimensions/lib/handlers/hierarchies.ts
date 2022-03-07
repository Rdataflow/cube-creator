import { asyncMiddleware } from 'middleware-async'
import { md, meta } from '@cube-creator/core/namespace'
import { getHierarchies } from '../domain/hierarchies'
import { parsingClient } from '../sparql'
import { getCollection } from './collection'

export const get = asyncMiddleware(async (req, res) => {
  const collection = await getCollection({
    memberQuads: await getHierarchies().execute(parsingClient.query),
    collectionType: md.Hierarchies,
    memberType: meta.Hierarchy,
    collection: req.hydra.resource.term,
  })

  return res.dataset(collection.dataset)
})
