/**
 * A* Pathfinding System for Enemy Navigation
 * Optimized for tower defense gameplay with wall obstacles
 */

// Min-Heap implementation for efficient priority queue
class MinHeap {
  constructor() {
    this.data = []
  }

  push(node) {
    this.data.push(node)
    this.bubbleUp(this.data.length - 1)
  }

  pop() {
    if (this.data.length === 0) return null
    if (this.data.length === 1) return this.data.pop()

    const min = this.data[0]
    this.data[0] = this.data.pop()
    this.bubbleDown(0)
    return min
  }

  isEmpty() {
    return this.data.length === 0
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (this.data[parentIndex].f <= this.data[index].f) break
      ;[this.data[parentIndex], this.data[index]] = [this.data[index], this.data[parentIndex]]
      index = parentIndex
    }
  }

  bubbleDown(index) {
    const length = this.data.length
    while (true) {
      const leftChild = 2 * index + 1
      const rightChild = 2 * index + 2
      let smallest = index

      if (leftChild < length && this.data[leftChild].f < this.data[smallest].f) {
        smallest = leftChild
      }
      if (rightChild < length && this.data[rightChild].f < this.data[smallest].f) {
        smallest = rightChild
      }

      if (smallest === index) break
      ;[this.data[smallest], this.data[index]] = [this.data[index], this.data[smallest]]
      index = smallest
    }
  }
}

// Pathfinding node
class PathNode {
  constructor(gx, gz) {
    this.gx = gx
    this.gz = gz
    this.g = Infinity  // Cost from start
    this.h = 0         // Heuristic to goal
    this.f = Infinity  // Total cost (g + h)
    this.parent = null
  }
}

// Main Pathfinding System
export class PathfindingSystem {
  constructor(wallGrid) {
    this.wallGrid = wallGrid
    this.pathCache = new Map()
    this.cacheTimeout = 500 // ms
    this.maxIterations = 1000 // Prevent infinite loops
  }

  // Generate cache key from start and end positions
  getCacheKey(startGx, startGz, endGx, endGz) {
    return `${startGx},${startGz}->${endGx},${endGz}`
  }

  // Get cached path if valid
  getCachedPath(startGx, startGz, endGx, endGz) {
    const key = this.getCacheKey(startGx, startGz, endGx, endGz)
    const cached = this.pathCache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.path
    }
    return null
  }

  // Cache a path
  cachePath(startGx, startGz, endGx, endGz, path) {
    const key = this.getCacheKey(startGx, startGz, endGx, endGz)
    this.pathCache.set(key, {
      path: path,
      timestamp: Date.now()
    })

    // Limit cache size
    if (this.pathCache.size > 200) {
      const firstKey = this.pathCache.keys().next().value
      this.pathCache.delete(firstKey)
    }
  }

  // Clear all cached paths (call when walls change)
  clearCache() {
    this.pathCache.clear()
  }

  // Manhattan distance heuristic
  heuristic(gx1, gz1, gx2, gz2) {
    return Math.abs(gx1 - gx2) + Math.abs(gz1 - gz2)
  }

  // Check if a grid cell is walkable
  isWalkable(gx, gz) {
    return !this.wallGrid.hasWall(gx, gz)
  }

  // Get walkable neighbors (4-directional)
  getNeighbors(gx, gz) {
    const neighbors = []
    const directions = [
      { dx: 0, dz: 1 },   // North
      { dx: 0, dz: -1 },  // South
      { dx: 1, dz: 0 },   // East
      { dx: -1, dz: 0 }   // West
    ]

    for (const { dx, dz } of directions) {
      const nx = gx + dx
      const nz = gz + dz
      if (this.isWalkable(nx, nz)) {
        neighbors.push({ gx: nx, gz: nz })
      }
    }

    return neighbors
  }

  // Find nearest walkable cell to a blocked position
  findNearestWalkable(gx, gz, maxRadius = 5) {
    if (this.isWalkable(gx, gz)) {
      return { gx, gz }
    }

    // Spiral outward search
    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r || Math.abs(dz) === r) {
            if (this.isWalkable(gx + dx, gz + dz)) {
              return { gx: gx + dx, gz: gz + dz }
            }
          }
        }
      }
    }

    return null
  }

  // Main A* pathfinding algorithm
  findPath(startX, startZ, targetX, targetZ) {
    // Convert world to grid coordinates
    const start = this.wallGrid.worldToGrid(startX, startZ)
    let goal = this.wallGrid.worldToGrid(targetX, targetZ)

    // Check cache first
    const cached = this.getCachedPath(start.gx, start.gz, goal.gx, goal.gz)
    if (cached) {
      return cached
    }

    // If goal is blocked, find nearest walkable
    if (!this.isWalkable(goal.gx, goal.gz)) {
      const nearest = this.findNearestWalkable(goal.gx, goal.gz)
      if (!nearest) {
        return null // No path possible
      }
      goal = nearest
    }

    // If start is blocked, find nearest walkable
    let actualStart = start
    if (!this.isWalkable(start.gx, start.gz)) {
      const nearest = this.findNearestWalkable(start.gx, start.gz)
      if (!nearest) {
        return null
      }
      actualStart = nearest
    }

    // A* algorithm
    const openSet = new MinHeap()
    const closedSet = new Set()
    const nodeMap = new Map()

    const startNode = new PathNode(actualStart.gx, actualStart.gz)
    startNode.g = 0
    startNode.h = this.heuristic(actualStart.gx, actualStart.gz, goal.gx, goal.gz)
    startNode.f = startNode.h

    openSet.push(startNode)
    nodeMap.set(this.wallGrid.getKey(actualStart.gx, actualStart.gz), startNode)

    let iterations = 0

    while (!openSet.isEmpty() && iterations < this.maxIterations) {
      iterations++

      const current = openSet.pop()
      const currentKey = this.wallGrid.getKey(current.gx, current.gz)

      // Goal reached?
      if (current.gx === goal.gx && current.gz === goal.gz) {
        const path = this.reconstructPath(current)
        this.cachePath(start.gx, start.gz, goal.gx, goal.gz, path)
        return path
      }

      closedSet.add(currentKey)

      // Process neighbors
      for (const neighbor of this.getNeighbors(current.gx, current.gz)) {
        const neighborKey = this.wallGrid.getKey(neighbor.gx, neighbor.gz)

        if (closedSet.has(neighborKey)) continue

        const tentativeG = current.g + 1 // Uniform cost

        let neighborNode = nodeMap.get(neighborKey)
        if (!neighborNode) {
          neighborNode = new PathNode(neighbor.gx, neighbor.gz)
          nodeMap.set(neighborKey, neighborNode)
        }

        if (tentativeG < neighborNode.g) {
          neighborNode.parent = current
          neighborNode.g = tentativeG
          neighborNode.h = this.heuristic(neighbor.gx, neighbor.gz, goal.gx, goal.gz)
          neighborNode.f = neighborNode.g + neighborNode.h

          // Add to open set (may add duplicates, but heap handles it)
          openSet.push(neighborNode)
        }
      }
    }

    // No path found - cache the null result too
    this.cachePath(start.gx, start.gz, goal.gx, goal.gz, null)
    return null
  }

  // Reconstruct path from goal to start
  reconstructPath(goalNode) {
    const path = []
    let current = goalNode

    while (current) {
      const world = this.wallGrid.gridToWorld(current.gx, current.gz)
      path.unshift({ x: world.x, z: world.z, gx: current.gx, gz: current.gz })
      current = current.parent
    }

    return path
  }

  // Check if there's a direct line of sight (no walls blocking)
  hasLineOfSight(startX, startZ, endX, endZ) {
    const startGrid = this.wallGrid.worldToGrid(startX, startZ)
    const endGrid = this.wallGrid.worldToGrid(endX, endZ)

    // Bresenham's line algorithm for grid cells
    let gx = startGrid.gx
    let gz = startGrid.gz
    const dx = Math.abs(endGrid.gx - startGrid.gx)
    const dz = Math.abs(endGrid.gz - startGrid.gz)
    const sx = startGrid.gx < endGrid.gx ? 1 : -1
    const sz = startGrid.gz < endGrid.gz ? 1 : -1
    let err = dx - dz

    while (true) {
      // Check current cell (skip start position)
      if ((gx !== startGrid.gx || gz !== startGrid.gz) && this.wallGrid.hasWall(gx, gz)) {
        return false
      }

      // Reached end
      if (gx === endGrid.gx && gz === endGrid.gz) {
        return true
      }

      const e2 = 2 * err
      if (e2 > -dz) {
        err -= dz
        gx += sx
      }
      if (e2 < dx) {
        err += dx
        gz += sz
      }
    }
  }

  // Smooth path by removing unnecessary waypoints
  smoothPath(path) {
    if (!path || path.length < 3) return path

    const smoothed = [path[0]]
    let current = 0

    while (current < path.length - 1) {
      // Try to skip ahead to furthest visible point
      let furthest = current + 1
      for (let i = current + 2; i < path.length; i++) {
        if (this.hasLineOfSight(path[current].x, path[current].z, path[i].x, path[i].z)) {
          furthest = i
        }
      }
      smoothed.push(path[furthest])
      current = furthest
    }

    return smoothed
  }

  // Find path with smoothing for more natural movement
  findSmoothPath(startX, startZ, targetX, targetZ) {
    const path = this.findPath(startX, startZ, targetX, targetZ)
    if (!path) return null
    return this.smoothPath(path)
  }
}

export default PathfindingSystem
