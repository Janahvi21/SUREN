export type GeocodedLocation = {
  latitude: number
  longitude: number
  displayName: string
  approximate: boolean
}

export async function geocodeAddress(address: string, city: string, pincode: string, landmark = ''): Promise<GeocodedLocation> {
  const queries = [
    [address, landmark, city, 'India'],
    [address, city, 'India'],
  ].map((parts) => parts.filter(Boolean).join(', '))

  try {
    const postalResponse = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`)
    if (postalResponse.ok) {
      const postalData = (await postalResponse.json()) as Array<{ Status?: string; PostOffice?: Array<{ Name?: string; District?: string; State?: string }> }>
      const offices = postalData[0]?.PostOffice ?? []
      for (const office of offices.slice(0, 2)) {
        if (office.Name) queries.push([office.Name, city, office.District, office.State, 'India'].filter(Boolean).join(', '))
      }
    }
  } catch {
    // The postal lookup is an accuracy aid; Nominatim can still handle the address without it.
  }

  let result: { lat: string; lon: string; display_name: string; type?: string } | undefined
  let usedFallback = false

  for (const [index, query] of queries.entries()) {
    const params = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', limit: '1' })
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error('The location service is unavailable right now.')
    const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string; type?: string }>
    if (results[0]) {
      result = results[0]
      usedFallback = index >= 2
      break
    }
  }

  if (!result) throw new Error('Location could not be found. Check the address, city, and pincode.')

  return {
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    displayName: result.display_name,
    approximate: usedFallback || ['postcode', 'city', 'town', 'village', 'suburb'].includes(result.type ?? ''),
  }
}
