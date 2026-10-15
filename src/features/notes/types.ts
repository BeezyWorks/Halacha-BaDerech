import type { SeifLocation } from '../halacha/types'

export interface Note {
  id: string
  location: SeifLocation
  text: string
  createdAt: number
  updatedAt: number
}
