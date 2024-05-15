import winston from 'winston'
import { OnViolation } from 'barnard59-shacl/validate'
import { fromPointer } from '@rdfine/shacl/lib/ValidationReport'

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.simple(),
  ),
  transports: [
    new winston.transports.Console(),
  ],
})

export const prettyPrintReport: OnViolation = ({ context, report }) => {
  const jsonld = fromPointer(report.pointer).toJSON()
  context.logger.error(JSON.stringify(jsonld, null, 2))

  return false
}
