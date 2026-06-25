import { describe, expect, it } from 'vitest'
import { builtinVisualResources } from '../visual/visual-resources'

describe('visual resource library', () => {
  it('provides accessible built-in visual resources for active calculators', () => {
    expect(builtinVisualResources.length).toBeGreaterThanOrEqual(3)
    for (const resource of builtinVisualResources) {
      expect(resource.altText.length).toBeGreaterThan(10)
      expect(resource.source).toBeTruthy()
      expect(resource.license).toBeTruthy()
      expect(resource.relatedFields.length).toBeGreaterThan(0)
    }
  })
})
