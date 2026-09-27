import type { Resource } from './resourceService'

export type MatchCriteria = {
  category: string
  city: string
  quantity: number
}

export type MatchedResource = Resource & { matchScore: number; matchReasons: string[] }

export function rankResources(resources: Resource[], criteria: MatchCriteria): MatchedResource[] {
  return resources
    .filter((resource) => resource.status === 'AVAILABLE' || resource.status === 'PARTIALLY_ALLOCATED')
    .map((resource) => {
      const categoryMatch = criteria.category && resource.category?.name.toLowerCase() === criteria.category.toLowerCase()
      const cityMatch = criteria.city && resource.city?.toLowerCase().includes(criteria.city.toLowerCase())
      const quantityMatch = criteria.quantity > 0 && resource.quantity >= criteria.quantity
      const availabilityMatch = resource.status === 'AVAILABLE'
      const score = (categoryMatch ? 40 : 0) + (cityMatch ? 25 : 0) + (quantityMatch ? 20 : 0) + (availabilityMatch ? 15 : 0)
      const matchReasons = [
        categoryMatch && 'Category match',
        cityMatch && 'City match',
        quantityMatch && 'Sufficient quantity',
        availabilityMatch && 'Available now',
      ].filter(Boolean) as string[]
      return { ...resource, matchScore: score, matchReasons }
    })
    .sort((left, right) => right.matchScore - left.matchScore)
}
