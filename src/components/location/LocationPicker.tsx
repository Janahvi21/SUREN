import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import { Check, LoaderCircle, MapPin, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

import { Button } from '../ui/button'
import { geocodeAddress, type GeocodedLocation } from '../../services/geocodingService'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

type LocationPickerProps = {
  address: string
  city: string
  pincode: string
  landmark: string
  latitude: number | null
  longitude: number | null
  onChange: (location: { latitude: number; longitude: number }) => void
}

function DraggableMarker({ latitude, longitude, onChange }: Pick<LocationPickerProps, 'latitude' | 'longitude' | 'onChange'>) {
  const [position, setPosition] = useState<[number, number]>([latitude ?? 19.076, longitude ?? 72.8777])
  const map = useMapEvents({
    click(event) {
      setPosition([event.latlng.lat, event.latlng.lng])
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng })
    },
  })

  useEffect(() => {
    if (latitude == null || longitude == null) return
    const next: [number, number] = [latitude, longitude]
    setPosition(next)
    map.setView(next, 15)
  }, [latitude, longitude, map])

  return (
    <Marker
      position={position}
      icon={markerIcon}
      draggable
      eventHandlers={{
        dragend(event) {
          const next = event.target.getLatLng()
          setPosition([next.lat, next.lng])
          onChange({ latitude: next.lat, longitude: next.lng })
        },
      }}
    />
  )
}

export function LocationPicker({ address, city, pincode, landmark, latitude, longitude, onChange }: LocationPickerProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const hasLocation = latitude != null && longitude != null

  async function findLocation() {
    setStatus('loading')
    setMessage('')
    try {
      const result: GeocodedLocation = await geocodeAddress(address, city, pincode, landmark)
      onChange({ latitude: result.latitude, longitude: result.longitude })
      setStatus('found')
      setMessage(result.approximate ? 'Postal area found approximately. Drag the pin to the exact pickup point, then save.' : 'Location found. Confirm or adjust the pin.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Location could not be mapped.')
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Pickup location</p>
          <p className="mt-1 text-sm text-slate-600">Enter an address, then confirm the automatically generated pin.</p>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={() => void findLocation()} disabled={status === 'loading' || !address || !city || !pincode}>
          {status === 'loading' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {status === 'loading' ? 'Finding location...' : status === 'found' ? 'Location Found' : 'Find Location'}
          {status === 'found' && <Check className="h-4 w-4 text-emerald-600" />}
        </Button>
      </div>

      {message && <p className={`rounded-xl px-3 py-2 text-sm ${status === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{message}</p>}
      {hasLocation ? (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-800"><MapPin className="h-4 w-4 text-emerald-600" />Is this the correct pickup location? Drag the pin or click the map to adjust it.</p>
          <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom className="h-64 w-full rounded-xl"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><DraggableMarker latitude={latitude} longitude={longitude} onChange={onChange} /></MapContainer>
          <p className="text-xs text-slate-500">Coordinates are generated and stored internally. They are not shown to normal users.</p>
        </>
      ) : (
        <div className="grid h-24 place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">Map preview will appear after you find the location.</div>
      )}
    </div>
  )
}
