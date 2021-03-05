import namespace from '@rdfjs/namespace'
import env from './env'

type Shapes = 'shape/shared-dimension' | 'shape/shared-dimension-term-create' | 'shape/shared-dimension-term-update'

export const shape = namespace<Shapes>(`${env.MANAGED_DIMENSIONS_BASE}`)