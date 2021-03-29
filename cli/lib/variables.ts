import { Literal, Term, Quad_Subject as QuadSubject } from 'rdf-js'

declare module 'barnard59-core/lib/Pipeline' {
  interface VariableNames {
    jobUri: string
    executionUrl: string
    'graph-store-endpoint': string
    'graph-store-user': string
    'graph-store-password': string
    targetFile: string
    'target-graph': string
    revision: number
    namespace: string
    cubeIdentifier: string
    timestamp: Literal
    previousCubes: Map<Term, QuadSubject>
    isObservationTable: boolean
    graph: string
    bnodeUuid: string
  }
}
