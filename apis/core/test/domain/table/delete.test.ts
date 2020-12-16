import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import * as sinon from 'sinon'
import clownface, { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'
import DatasetExt from 'rdf-ext/lib/Dataset'
import { csvw, hydra, rdf, schema } from '@tpluscode/rdf-ns-builders'
import { cc } from '@cube-creator/core/namespace'
import { TestResourceStore } from '../../support/TestResourceStore'
import { NamedNode } from 'rdf-js'
import type * as DimensionMetadataQueries from '../../../lib/domain/queries/dimension-metadata'
import type * as TableQueries from '../../../lib/domain/queries/table'
import type * as ColumnMappingQueries from '../../../lib/domain/queries/column-mapping'
import '../../../lib/domain'
import { deleteTable } from '../../../lib/domain/table/delete'
import { ColumnMapping, Table } from '@cube-creator/model'

describe('domain/table/delete', () => {
  let store: TestResourceStore
  let getDimensionMetaDataCollection: sinon.SinonStub
  let dimensionMetadataQueries: typeof DimensionMetadataQueries
  const getLinkedTablesForSource = sinon.stub()
  const getTablesForMapping = sinon.stub()
  let tableQueries: typeof TableQueries
  let columnMappingQueries: typeof ColumnMappingQueries
  let dimensionIsUsedByOtherMapping: sinon.SinonStub
  let columnMapping : GraphPointer<NamedNode, DatasetExt>
  let table : GraphPointer<NamedNode, DatasetExt>
  let columnMappingObservation : GraphPointer<NamedNode, DatasetExt>
  let observationTable : GraphPointer<NamedNode, DatasetExt>
  let dimensionMetadataCollection : GraphPointer<NamedNode, DatasetExt>

  beforeEach(() => {
    const csvMapping = clownface({ dataset: $rdf.dataset() })
      .namedNode('myCsvMapping')
      .addOut(rdf.type, cc.CsvMapping)
      .addOut(cc.tables, $rdf.namedNode('tables'))
      .addOut(cc.namespace, 'http://example.com/')

    const csvSource = clownface({ dataset: $rdf.dataset() })
      .namedNode('foo')
      .addOut(rdf.type, cc.CSVSource)
      .addOut(csvw.column, $rdf.namedNode('my-column'), (column) => {
        column.addOut(schema.name, $rdf.literal('My Column'))
      })

    columnMapping = clownface({ dataset: $rdf.dataset() })
      .node($rdf.namedNode('columnMapping'))
      .addOut(rdf.type, cc.ColumnMapping)
      .addOut(rdf.type, hydra.Resource)
      .addOut(cc.sourceColumn, $rdf.namedNode('my-column'))
      .addOut(cc.targetProperty, $rdf.namedNode('test'))

    table = clownface({ dataset: $rdf.dataset() })
      .namedNode('myTable')
      .addOut(rdf.type, cc.Table)
      .addOut(cc.csvMapping, csvMapping)
      .addOut(cc.csvSource, csvSource)
      .addOut(schema.name, 'the name')
      .addOut(schema.color, '#ababab')
      .addOut(cc.identifierTemplate, '{id}')
      .addOut(cc.columnMapping, columnMapping)

    columnMappingObservation = clownface({ dataset: $rdf.dataset() })
      .node($rdf.namedNode('columnMappingObservation'))
      .addOut(rdf.type, cc.ColumnMapping)
      .addOut(rdf.type, hydra.Resource)
      .addOut(cc.sourceColumn, $rdf.namedNode('my-column'))
      .addOut(cc.targetProperty, $rdf.namedNode('testObservation'))

    observationTable = clownface({ dataset: $rdf.dataset() })
      .namedNode('myObservationTable')
      .addOut(rdf.type, cc.Table)
      .addOut(rdf.type, cc.ObservationTable)
      .addOut(cc.csvMapping, csvMapping)
      .addOut(cc.csvSource, csvSource)
      .addOut(schema.name, 'the name')
      .addOut(schema.color, '#ababab')
      .addOut(cc.identifierTemplate, '{id}')
      .addOut(cc.columnMapping, columnMappingObservation)

    dimensionMetadataCollection = clownface({ dataset: $rdf.dataset() })
      .namedNode('dimensionMetadataCollection')
      .addOut(rdf.type, cc.DimensionMetadataCollection)
      .addOut(schema.hasPart, $rdf.namedNode('myDimension'), dim => {
        dim.addOut(schema.about, $rdf.namedNode('testObservation'))
      })

    store = new TestResourceStore([
      csvSource,
      csvMapping,
      columnMapping,
      table,
      columnMappingObservation,
      observationTable,
      dimensionMetadataCollection,
    ])

    getDimensionMetaDataCollection = sinon.stub().resolves(dimensionMetadataCollection.term.value)
    dimensionMetadataQueries = { getDimensionMetaDataCollection }
    const getTableForColumnMapping = sinon.stub().resolves(observationTable.term.value)
    tableQueries = {
      getLinkedTablesForSource,
      getTablesForMapping,
      getTableForColumnMapping,
    }

    dimensionIsUsedByOtherMapping = sinon.stub().resolves(false)
    columnMappingQueries = {
      dimensionIsUsedByOtherMapping,
    }
  })

  it('deletes the table', async () => {
    // given

    // when
    await deleteTable({ resource: table.term, store, dimensionMetadataQueries, tableQueries, columnMappingQueries })
    await store.save()

    // then
    const deletedTable = await store.getResource<Table>(table.term, { allowMissing: true })
    expect(deletedTable).to.eq(undefined)

    const deletedColumnMapping = await store.getResource<ColumnMapping>(columnMapping.term, { allowMissing: true })
    expect(deletedColumnMapping).to.eq(undefined)
  })

  it('deletes the observation table', async () => {
    // given

    // when
    await deleteTable({ resource: observationTable.term, store, dimensionMetadataQueries, tableQueries, columnMappingQueries })
    await store.save()

    // then
    const deletedTable = await store.getResource<Table>(observationTable.term, { allowMissing: true })
    expect(deletedTable).to.eq(undefined)

    const deletedColumnMapping = await store.getResource<ColumnMapping>(columnMappingObservation.term, { allowMissing: true })
    expect(deletedColumnMapping).to.eq(undefined)

    expect(dimensionMetadataCollection.out(schema.hasPart).values.length).to.eq(0)
  })

  it('deletes the observation table but not the used dimensions', async () => {
    // given
    dimensionIsUsedByOtherMapping.resolves(true)

    // when
    await deleteTable({ resource: observationTable.term, store, dimensionMetadataQueries, tableQueries, columnMappingQueries })
    await store.save()

    // then
    const deletedTable = await store.getResource<Table>(observationTable.term, { allowMissing: true })
    expect(deletedTable).to.eq(undefined)

    const deletedColumnMapping = await store.getResource<ColumnMapping>(columnMappingObservation.term, { allowMissing: true })
    expect(deletedColumnMapping).to.eq(undefined)

    expect(dimensionMetadataCollection.out(schema.hasPart).values.length).to.eq(1)
  })
})
