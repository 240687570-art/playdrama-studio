import './load-env.mjs'
import {
  evaluateProductionReadiness,
  formatProductionReadinessReport,
} from './readiness.mjs'

const API_BASE = process.env.PLAYDRAMA_API_BASE || ''
const REQUIRE_LOCAL_ENV_MATCH = process.env.PLAYDRAMA_REQUIRE_LOCAL_ENV_MATCH === 'true'

async function fetchApiReadiness() {
  if (!API_BASE) return null
  const response = await fetch(`${API_BASE}/api/readiness`)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`GET ${API_BASE}/api/readiness returned ${response.status}`)
  }
  return body
}

function printMissing(readiness) {
  for (const item of readiness.missing) {
    const fields = item.missingFields.length > 0 ? ` (${item.missingFields.join(', ')})` : ''
    console.log(`- ${item.area} / ${item.label}${fields}: ${item.action}`)
  }
}

async function main() {
  const envReadiness = evaluateProductionReadiness(process.env)
  const apiReadiness = await fetchApiReadiness()
  const readiness = apiReadiness || envReadiness
  const envMatchesApi =
    !apiReadiness ||
    !REQUIRE_LOCAL_ENV_MATCH ||
    (
      apiReadiness.status === envReadiness.status &&
      apiReadiness.passed === envReadiness.passed &&
      apiReadiness.total === envReadiness.total
    )

  console.log('PlayDrama launch gate')
  console.log(`Source: ${apiReadiness ? `${API_BASE}/api/readiness` : 'local environment'}`)
  console.log(`Decision: ${readiness.status === 'pass' && envMatchesApi ? 'GO' : 'NO-GO'}`)
  console.log('')
  console.log(formatProductionReadinessReport(readiness))

  if (!envMatchesApi) {
    console.log('')
    console.log('NO-GO: Local environment and running API readiness do not match.')
    console.log('Action: restart the API with the intended deployment environment variables, then rerun npm run launch:gate.')
  } else if (apiReadiness && !REQUIRE_LOCAL_ENV_MATCH) {
    console.log('')
    console.log('Remote API readiness is authoritative. Set PLAYDRAMA_REQUIRE_LOCAL_ENV_MATCH=true when validating a local API process before deploy.')
  }

  if (readiness.status !== 'pass') {
    console.log('')
    console.log('Launch blockers')
    printMissing(readiness)
  }

  if (readiness.status !== 'pass' || !envMatchesApi) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Launch gate failed')
  console.error(error.message)
  process.exitCode = 1
})
