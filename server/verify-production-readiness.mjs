import './load-env.mjs'
import {
  evaluateProductionReadiness,
  formatProductionReadinessReport,
} from './readiness.mjs'

const readiness = evaluateProductionReadiness(process.env)

console.log(formatProductionReadinessReport(readiness))

if (readiness.status !== 'pass') {
  process.exitCode = 1
}
