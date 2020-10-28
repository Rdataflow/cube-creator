import { NamedNode } from 'rdf-js'
import { ASK, SELECT } from '@tpluscode/sparql-builder'
import { cc } from '@cube-creator/core/namespace'
import { schema } from '@tpluscode/rdf-ns-builders'
import { streamClient } from '../../query-client'

export async function sourceWithFilenameExists(csvMapping: NamedNode, fileName: string, client = streamClient): Promise<boolean> {
  return ASK`
      GRAPH ${csvMapping}
      {
        ${csvMapping} ${cc.csvSource} ?source
      }
      GRAPH ?source
      {
        ?source ${schema.name} "${fileName}"
      }
      `
    .execute(client.query)
}

export async function getSourcesFromMapping(csvMapping: NamedNode, client = streamClient): Promise<any> {
  const stream = await SELECT.DISTINCT`?source`
    .WHERE`      
    GRAPH ${csvMapping}
    {
      ${csvMapping} ${cc.csvSource} ?source
    }
    `
    .execute(client.query)

  return new Promise((resolve, reject) => {
    const sources: string[] = []

    stream.on('data', row => {
      Object.entries(row).forEach(([, value]) => {
        if (value) {
          sources.push(value as string)
        }
      })
    })

    stream.on('end', () => resolve(sources))
    stream.on('error', error => reject(error))
  })
}
