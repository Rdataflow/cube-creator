import type { Shape } from '@rdfine/shacl'
import * as $rdf from '@rdf-esm/dataset'
import type { RdfResource, ResourceIdentifier, RuntimeOperation } from 'alcaeus'
import clownface, { GraphPointer } from 'clownface'
import { computed, ref, Ref, shallowRef, ShallowRef, watch } from 'vue'
import { Term } from 'rdf-js'

import { api } from './api'
import { APIErrorValidation, ErrorDetails } from './api/errors'

const initResource = () => clownface({ dataset: $rdf.dataset() }).namedNode('')

interface HydraFormOptions {
  beforeSubmit?: () => Promise<boolean> | boolean
  afterSubmit?: (savedResource: RdfResource) => any
  fetchShapeParams?: { targetClass?: Term }
  saveHeaders?: HeadersInit
}

export function useHydraForm (operation: Ref<RuntimeOperation | null>, options: HydraFormOptions = {}) {
  const resource: Ref<GraphPointer | null> = ref(initResource())
  const shape: ShallowRef<Shape | null> = shallowRef(null)
  const error: ShallowRef<ErrorDetails | null> = shallowRef(null)
  const isSubmitting = ref(false)

  const loadShape = async () => {
    resource.value = initResource()
    shape.value = null
    error.value = null
    isSubmitting.value = false

    if (operation.value) {
      shape.value = await api.fetchOperationShape(operation.value, options.fetchShapeParams)
    }
  }
  watch(operation, loadShape, { immediate: true })

  const title = computed(() => operation.value?.title ?? '...')

  const onSubmit = async (data: GraphPointer<ResourceIdentifier>) => {
    if (options.beforeSubmit) {
      const shouldContinue = await options.beforeSubmit()
      if (!shouldContinue) {
        return
      }
    }

    error.value = null
    isSubmitting.value = true

    try {
      const savedResource = await api.invokeSaveOperation<RdfResource>(operation.value, data, options.saveHeaders)

      if (options.afterSubmit) {
        await options.afterSubmit(savedResource)
      }
    } catch (e: any) {
      error.value = e.details ?? { detail: e.toString() }

      if (!(e instanceof APIErrorValidation)) {
        console.error(e)
      }
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    operation,
    resource,
    shape,
    error,
    isSubmitting,
    title,
    onSubmit,
  }
}