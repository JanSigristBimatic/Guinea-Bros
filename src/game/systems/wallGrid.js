/**
 * Wall Grid System - Manages wall placement on a grid with neighbor connections
 */

// Wall cell data structure
export class WallCell {
  constructor(gx, gz, building) {
    this.gx = gx
    this.gz = gz
    this.building = building
    this.neighbors = {
      north: null, // +Z
      south: null, // -Z
      east: null,  // +X
      west: null   // -X
    }
    this.segmentType = 'post'
    this.rotation = 0
    this.segmentLocked = false
    this.rotationLocked = false
  }

  getNeighborCount() {
    return Object.values(this.neighbors).filter(n => n !== null).length
  }
}

// Main grid management class
export class WallGrid {
  constructor(cellSize = 2) {
    this.cellSize = cellSize
    this.cells = new Map() // "gx,gz" -> WallCell
    this.blockedCells = new Set() // Non-wall blockers (buildings)
  }

  // Convert world coordinates to grid coordinates
  worldToGrid(x, z) {
    return {
      gx: Math.round(x / this.cellSize),
      gz: Math.round(z / this.cellSize)
    }
  }

  // Convert grid coordinates to world coordinates
  gridToWorld(gx, gz) {
    return {
      x: gx * this.cellSize,
      z: gz * this.cellSize
    }
  }

  // Generate key for Map storage
  getKey(gx, gz) {
    return `${gx},${gz}`
  }

  // Parse key back to coordinates
  parseKey(key) {
    const [gx, gz] = key.split(',').map(Number)
    return { gx, gz }
  }

  // Check if a cell has a wall
  hasWall(gx, gz) {
    const key = this.getKey(gx, gz)
    return this.cells.has(key) || this.blockedCells.has(key)
  }

  // Get wall cell at position
  getWall(gx, gz) {
    return this.cells.get(this.getKey(gx, gz))
  }

  // Mark/unmark a non-wall blocked cell
  setBlocked(gx, gz, blocked = true) {
    const key = this.getKey(gx, gz)
    if (blocked) {
      this.blockedCells.add(key)
    } else {
      this.blockedCells.delete(key)
    }
  }

  isBlockedCell(gx, gz) {
    return this.blockedCells.has(this.getKey(gx, gz))
  }

  // Add a wall to the grid
  addWall(gx, gz, building, options = {}) {
    const key = this.getKey(gx, gz)
    if (this.cells.has(key)) {
      return null // Already occupied
    }

    const cell = new WallCell(gx, gz, building)
    this.cells.set(key, cell)

    const {
      connect = true,
      segmentType,
      rotation,
      lockSegmentType = false,
      lockRotation = false
    } = options

    if (segmentType) {
      cell.segmentType = segmentType
    }
    if (Number.isFinite(rotation)) {
      cell.rotation = rotation
    }
    if (lockSegmentType) {
      cell.segmentLocked = true
    }
    if (lockRotation) {
      cell.rotationLocked = true
    }

    if (connect) {
      // Connect with neighbors
      this.connectNeighbors(cell)

      // Determine segment type for this cell and affected neighbors
      this.updateSegmentType(cell)
      this.updateNeighborSegments(cell)
    }

    return cell
  }

  // Remove a wall from the grid
  removeWall(gx, gz) {
    const key = this.getKey(gx, gz)
    const cell = this.cells.get(key)
    if (!cell) return null

    // Disconnect from neighbors
    this.disconnectNeighbors(cell)

    // Remove from grid
    this.cells.delete(key)

    // Update neighbor segment types
    const directions = ['north', 'south', 'east', 'west']
    directions.forEach(dir => {
      if (cell.neighbors[dir]) {
        this.updateSegmentType(cell.neighbors[dir])
      }
    })

    return cell
  }

  // Connect a cell with its neighbors
  connectNeighbors(cell) {
    const { gx, gz } = cell
    const directions = [
      { dx: 0, dz: 1, dir: 'north', opposite: 'south' },
      { dx: 0, dz: -1, dir: 'south', opposite: 'north' },
      { dx: 1, dz: 0, dir: 'east', opposite: 'west' },
      { dx: -1, dz: 0, dir: 'west', opposite: 'east' }
    ]

    directions.forEach(({ dx, dz, dir, opposite }) => {
      const neighbor = this.getWall(gx + dx, gz + dz)
      if (neighbor) {
        if (neighbor.segmentType === 'diagonal' || cell.segmentType === 'diagonal') {
          return
        }
        cell.neighbors[dir] = neighbor
        neighbor.neighbors[opposite] = cell
      }
    })
  }

  // Disconnect a cell from its neighbors
  disconnectNeighbors(cell) {
    const opposites = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east'
    }

    Object.entries(cell.neighbors).forEach(([dir, neighbor]) => {
      if (neighbor) {
        neighbor.neighbors[opposites[dir]] = null
      }
    })
  }

  // Update segment types for all neighbors of a cell
  updateNeighborSegments(cell) {
    Object.values(cell.neighbors).forEach(neighbor => {
      if (neighbor) {
        this.updateSegmentType(neighbor)
      }
    })
  }

  // Determine and set segment type based on neighbors
  updateSegmentType(cell) {
    const { type, rotation } = this.determineSegmentType(cell.neighbors)
    if (!cell.segmentLocked) {
      cell.segmentType = type
    }
    if (!cell.rotationLocked && Number.isFinite(rotation)) {
      cell.rotation = rotation
    }
    return { type: cell.segmentType, rotation: cell.rotation }
  }

  // Determine segment type and rotation based on neighbor configuration
  determineSegmentType(neighbors) {
    const n = !!(neighbors && neighbors.north)
    const s = !!(neighbors && neighbors.south)
    const e = !!(neighbors && neighbors.east)
    const w = !!(neighbors && neighbors.west)
    const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0)

    // 0 neighbors: post
    if (count === 0) {
      return { type: 'post', rotation: 0 }
    }

    // 1 neighbor: end piece (pointing toward the neighbor)
    if (count === 1) {
      if (n) return { type: 'end', rotation: 0 }
      if (s) return { type: 'end', rotation: 180 }
      if (e) return { type: 'end', rotation: -90 }
      if (w) return { type: 'end', rotation: 90 }
    }

    // 2 neighbors: straight or corner
    if (count === 2) {
      // Straight (opposite neighbors)
      if (n && s) return { type: 'straight', rotation: 0 }
      if (e && w) return { type: 'straight', rotation: 90 }

      // Corner (adjacent neighbors)
      if (n && e) return { type: 'corner', rotation: 0 }
      if (e && s) return { type: 'corner', rotation: -90 }
      if (s && w) return { type: 'corner', rotation: 180 }
      if (w && n) return { type: 'corner', rotation: 90 }
    }

    // 3 neighbors: T-piece
    if (count === 3) {
      if (!n) return { type: 'tee', rotation: 180 }  // Missing north
      if (!s) return { type: 'tee', rotation: 0 }    // Missing south
      if (!e) return { type: 'tee', rotation: 90 }   // Missing east
      if (!w) return { type: 'tee', rotation: -90 }  // Missing west
    }

    // 4 neighbors: cross
    return { type: 'cross', rotation: 0 }
  }

  // Get all cells in the grid
  getAllCells() {
    return Array.from(this.cells.values())
  }

  // Clear the entire grid
  clear() {
    this.cells.clear()
    this.blockedCells.clear()
  }

  // Check if a world position is blocked by a wall
  isBlocked(x, z) {
    const { gx, gz } = this.worldToGrid(x, z)
    return this.hasWall(gx, gz)
  }

  // Get grid bounds (for pathfinding)
  getBounds() {
    if (this.cells.size === 0) {
      return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 }
    }

    let minX = Infinity, maxX = -Infinity
    let minZ = Infinity, maxZ = -Infinity

    this.cells.forEach((cell) => {
      minX = Math.min(minX, cell.gx)
      maxX = Math.max(maxX, cell.gx)
      minZ = Math.min(minZ, cell.gz)
      maxZ = Math.max(maxZ, cell.gz)
    })

    return { minX, maxX, minZ, maxZ }
  }
}

export default WallGrid
