import { GraphPointer } from 'clownface'
import { csvw, schema, xsd } from '@tpluscode/rdf-ns-builders'
import { cc } from '@cube-creator/core/namespace'
import { ResourceStore } from '../../ResourceStore'
import { resourceStore } from '../resources'
import { NamedNode } from 'rdf-js'
import $rdf from 'rdf-ext'
import { NotFoundError } from '../../errors'
import { CsvColumn, CsvMapping, CsvSource, DimensionMetadataCollection } from '@cube-creator/model'
import * as DimensionMetadataQueries from '../queries/dimension-metadata'

const trueTerm = $rdf.literal('true', xsd.boolean)

interface CreateTableCommand {
  tableCollection: GraphPointer<NamedNode>
  resource: GraphPointer
  store?: ResourceStore
  dimensionMetadataQueries?: Pick<typeof DimensionMetadataQueries, 'getDimensionMetaDataCollection'>
}

export async function createTable({
  tableCollection,
  resource,
  store = resourceStore(),
  dimensionMetadataQueries: { getDimensionMetaDataCollection } = DimensionMetadataQueries,
}: CreateTableCommand): Promise<GraphPointer> {
  const label = resource.out(schema.name)
  if (!label?.value) {
    throw new Error('schema:name missing from the payload')
  }

  const csvMappingPointer = tableCollection.out(cc.csvMapping)
  if (csvMappingPointer?.term?.termType !== 'NamedNode') {
    throw new Error('cc:csvMapping missing from the payload')
  }

  const csvMapping = await store.getResource<CsvMapping>(csvMappingPointer.term)
  if (!csvMapping) {
    throw new NotFoundError(csvMappingPointer.term)
  }
  const csvSourceId = resource.out(cc.csvSource).term
  const csvSource = await store.getResource<CsvSource>(csvSourceId)
  if (!csvSource) {
    throw new NotFoundError(csvSourceId)
  }

  const columns = [...csvSource.columns]

  const table = await csvMapping.addTable(store, {
    name: label.value,
    csvSource,
    identifierTemplate: getTemplate(resource.out(cc.identifierTemplate).value, columns),
    color: resource.out(schema.color).value,
    isObservationTable: trueTerm.equals(resource.out(cc.isObservationTable).term),
  })

  // Create default column mappings for provided columns
  const dimensionMetaDataCollectionPointer = await getDimensionMetaDataCollection(csvMapping.id)
  const dimensionMetaDataCollection = await store.getResource<DimensionMetadataCollection>(dimensionMetaDataCollectionPointer)
  if (!dimensionMetaDataCollection) {
    throw new NotFoundError(dimensionMetaDataCollectionPointer)
  }

  resource.out(csvw.column)
    .forEach(({ term: columnId }) => {
      const column = columns
        .find(({ id }) => id.equals(columnId))
      if (!column) {
        throw new Error(`Column ${columnId} not found`)
      }

      const columnMapping = table.addColumnMappingFromColumn({
        store,
        column,
      })

      if (table.types.has(cc.ObservationTable)) {
        dimensionMetaDataCollection.addDimensionMetadata({
          store, columnMapping,
        })
      }

      return columnMapping
    })

  await store.save()
  return table.pointer
}

function getTemplate(template: string | undefined, columns: CsvColumn[]): string {
  if (template?.trim()) return template
  return columns.sort((a, b) => (a.order - b.order)).map((column) => `{${column.name}}`).join('/')
}
