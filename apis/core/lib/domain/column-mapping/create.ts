import { GraphPointer } from 'clownface'
import { cc } from '@cube-creator/core/namespace'
import { ResourceStore } from '../../ResourceStore'
import { resourceStore } from '../resources'
import { NamedNode, Term } from 'rdf-js'
import { CsvColumn, CsvMapping, CsvSource, DimensionMetadataCollection, LiteralColumnMapping, ReferenceColumnMapping, Table } from '@cube-creator/model'
import * as DimensionMetadataQueries from '../queries/dimension-metadata'
import { findMapping } from './lib'
import { NotFoundError, DomainError } from '../../errors'
import { rdf } from '@tpluscode/rdf-ns-builders'
import TermSet from '@rdfjs/term-set'

interface CreateColumnMappingCommand {
  tableId: NamedNode
  resource: GraphPointer
  store?: ResourceStore
  dimensionMetadataQueries?: Pick<typeof DimensionMetadataQueries, 'getDimensionMetaDataCollection'>
}

export async function createColumnMapping({
  tableId,
  resource,
  store = resourceStore(),
  dimensionMetadataQueries: { getDimensionMetaDataCollection } = DimensionMetadataQueries,
}: CreateColumnMappingCommand): Promise<GraphPointer> {
  const table = await store.getResource<Table>(tableId)

  if (!table) {
    throw new NotFoundError(tableId)
  }

  const targetProperty = resource.out(cc.targetProperty).term!
  if (table.isObservationTable) {
    const mappingExists = await findMapping(table, targetProperty, store)
    if (mappingExists) {
      throw new DomainError('Target property already mapped')
    }
  }

  const resourceTypes = new TermSet(resource.out(rdf.type).terms)
  const columnMapping = resourceTypes.has(cc.ReferenceColumnMapping)
    ? await createReferenceColumnMapping({ targetProperty, table, resource, store })
    : await createLiteralColumnMapping({ targetProperty, table, resource, store })

  if (table.types.has(cc.ObservationTable)) {
    const csvMapping = await store.getResource<CsvMapping>(table.csvMapping.id)
    if (!csvMapping) {
      throw new NotFoundError(csvMapping)
    }
    const dimensionMetaDataCollectionPointer = await getDimensionMetaDataCollection(table.csvMapping.id)
    const dimensionMetaDataCollection = await store.getResource<DimensionMetadataCollection>(dimensionMetaDataCollectionPointer)
    if (!dimensionMetaDataCollection) {
      throw new NotFoundError(dimensionMetaDataCollectionPointer)
    }

    dimensionMetaDataCollection.addDimensionMetadata({
      store, columnMapping, csvMapping,
    })
  }

  store.save()

  return columnMapping.pointer
}

interface CreateLiteralColumnMappingCommand {
  targetProperty: Term
  table: Table
  resource: GraphPointer
  store: ResourceStore
}

async function createLiteralColumnMapping({ targetProperty, table, resource, store }: CreateLiteralColumnMappingCommand): Promise<LiteralColumnMapping> {
  const columnId = resource.out(cc.sourceColumn).term as NamedNode
  const source = await store.getResource<CsvSource>(table.csvSource?.id)
  const column = source?.columns.find(({ id }) => id.equals(columnId))

  if (!column) {
    throw new NotFoundError(columnId)
  }

  return table.addLiteralColumnMapping({
    store,
    sourceColumn: column,
    targetProperty,
    datatype: resource.out(cc.datatype).term as NamedNode,
    language: resource.out(cc.language).value,
    defaultValue: resource.out(cc.defaultValue).term,
  })
}

interface CreateReferenceColumnMappingCommand {
  targetProperty: Term
  table: Table
  resource: GraphPointer
  store: ResourceStore
}

async function createReferenceColumnMapping({ targetProperty, table, resource, store }: CreateReferenceColumnMappingCommand): Promise<ReferenceColumnMapping> {
  const referencedTableId = resource.out(cc.referencedTable).term
  const referencedTable = await store.getResource<Table>(referencedTableId)

  if (!referencedTable) {
    throw new NotFoundError(referencedTableId)
  }

  const identifierMappings = await Promise.all(resource.out(cc.identifierMapping).map(async (identifierMapping) => {
    const sourceColumnId = identifierMapping.out(cc.sourceColumn).term!
    const sourceColumn = await store.getResource<CsvColumn>(identifierMapping.out(cc.sourceColumn).term!)
    if (!sourceColumn) {
      throw new NotFoundError(sourceColumnId)
    }

    const referencedColumnId = identifierMapping.out(cc.referencedColumn).term!
    const referencedColumn = await store.getResource<CsvColumn>(referencedColumnId)
    if (!referencedColumn) {
      throw new NotFoundError(referencedColumnId)
    }

    return {
      sourceColumn,
      referencedColumn,
    }
  }))

  return table.addReferenceColumnMapping({
    store,
    targetProperty,
    referencedTable,
    identifierMappings,
  })
}
