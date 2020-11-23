import { join } from 'path'
import { URL } from 'url'

export function urlJoin(base, part) {
  const url = new URL(base)

  url.pathname = join(url.pathname, part)

  return url.toString()
}
