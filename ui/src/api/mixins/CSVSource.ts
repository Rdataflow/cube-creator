import { Resource } from 'alcaeus'
import { Constructor } from '@tpluscode/rdfine'
import * as ns from '@cube-creator/core/namespace'
import { schema, csvw } from '@tpluscode/rdf-ns-builders'
import { Source, CSVColumn } from '@/types'
import { commonActions, findOperation } from '../common'

export default function Mixin<Base extends Constructor<Resource>> (base: Base) {
  return class extends base implements Source {
    get actions () {
      return {
        ...commonActions(this),
        delete: findOperation(this, ns.cc.DeleteCSVSourceAction),
      }
    }

    get name (): string {
      return this.getString(schema.name)
    }

    get columns (): CSVColumn[] {
      return this.getArray<CSVColumn>(csvw.column)
        .sort((c1, c2) => c1.order - c2.order)
    }

    get error (): string {
      return this.getString(schema.error)
    }
  }
}

Mixin.appliesTo = ns.cc.CSVSource
