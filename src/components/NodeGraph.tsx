/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback, useRef } from 'react'

interface NodePosition {
  id: string
  x: number
  y: number
}

interface AutoLayoutOptions {
  direction: 'horizontal' | 'vertical'
  spacingX: number
  spacingY: number
  align: 'center' | 'left' | 'right'
}

export function useNodeAutoLayout() {
  const layoutRef = useRef<Map<string, NodePosition>>(new Map())

  const calculateAutoLayout = useCallback(
    (nodes: { id: string; parentId?: string; choices?: { targetNodeId: string }[] }[]): NodePosition[] => {
      const positions: NodePosition[] = []
      const levels = new Map<string, number>()

      // Build adjacency list
      const adjacency = new Map<string, string[]>()
      nodes.forEach((node) => {
        if (!adjacency.has(node.id)) adjacency.set(node.id, [])
        node.choices?.forEach((choice) => {
          adjacency.get(node.id)?.push(choice.targetNodeId)
        })
      })

      // BFS to calculate levels
      const root = nodes[0]
      if (root) {
        levels.set(root.id, 0)
        const queue = [root.id]
        while (queue.length > 0) {
          const current = queue.shift()!
          const currentLevel = levels.get(current) || 0
          const children = adjacency.get(current) || []
          children.forEach((childId) => {
            if (!levels.has(childId)) {
              levels.set(childId, currentLevel + 1)
              queue.push(childId)
            }
          })
        }
      }

      // Group nodes by level
      const levelGroups = new Map<number, string[]>()
      levels.forEach((level, id) => {
        if (!levelGroups.has(level)) levelGroups.set(level, [])
        levelGroups.get(level)!.push(id)
      })

      // Calculate positions
      const defaultOptions: AutoLayoutOptions = {
        direction: 'horizontal',
        spacingX: 200,
        spacingY: 100,
        align: 'center',
      }

      levelGroups.forEach((nodeIds, level) => {
        const totalWidth = (nodeIds.length - 1) * defaultOptions.spacingX
        nodeIds.forEach((id, index) => {
          const x = defaultOptions.direction === 'horizontal' ? level * defaultOptions.spacingX : index * defaultOptions.spacingX - totalWidth / 2
          const y = defaultOptions.direction === 'horizontal' ? index * defaultOptions.spacingY - ((nodeIds.length - 1) * defaultOptions.spacingY) / 2 : level * defaultOptions.spacingY
          positions.push({ id, x, y })
        })
      })

      return positions
    },
    []
  )

  const applyLayout = useCallback((positions: NodePosition[]) => {
    positions.forEach((pos) => {
      layoutRef.current.set(pos.id, pos)
    })
  }, [])

  return { calculateAutoLayout, applyLayout, layoutRef }
}

export function useNodeThumbnail() {
  const generateThumbnail = useCallback(
    (canvas: HTMLCanvasElement, scale: number = 0.2): string => {
      const thumbnailCanvas = document.createElement('canvas')
      thumbnailCanvas.width = canvas.width * scale
      thumbnailCanvas.height = canvas.height * scale
      const ctx = thumbnailCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height)
      }
      return thumbnailCanvas.toDataURL('image/png')
    },
    []
  )

  return { generateThumbnail }
}

export function useBatchOperations() {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())

  const selectNode = useCallback((id: string, multi: boolean = false) => {
    setSelectedNodes((prev) => {
      const newSet = multi ? new Set<string>(prev) : new Set<string>()
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedNodes(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedNodes(new Set())
  }, [])

  const deleteSelected = useCallback(<T extends { id: string }>(nodes: T[]) => {
    return nodes.filter((node) => !selectedNodes.has(node.id))
  }, [selectedNodes])

  return { selectedNodes, selectNode, selectAll, clearSelection, deleteSelected }
}

interface NodeGraphProps {
  nodes: { id: string; title: string; kind: string; x: number; y: number }[]
  connections: { from: string; to: string }[]
  onNodeSelect?: (id: string) => void
  onNodeMove?: (id: string, x: number, y: number) => void
}

export function NodeGraph({ nodes, connections, onNodeSelect, onNodeMove }: NodeGraphProps) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const node = nodes.find((n) => n.id === id)
    if (node) {
      setDragging(id)
      setDragOffset({
        x: e.clientX - node.x,
        y: e.clientY - node.y,
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging && onNodeMove) {
      onNodeMove(dragging, e.clientX - dragOffset.x, e.clientY - dragOffset.y)
    }
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  const getNodeColor = (kind: string) => {
    switch (kind) {
      case 'Hook':
        return '#3b82f6'
      case 'Choice':
        return '#10b981'
      case 'Puzzle':
        return '#f59e0b'
      case 'Ending':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="600"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="cursor-grab"
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
        </marker>
      </defs>

      {/* Connections */}
      {connections.map((conn, index) => {
        const fromNode = nodes.find((n) => n.id === conn.from)
        const toNode = nodes.find((n) => n.id === conn.to)
        if (!fromNode || !toNode) return null
        return (
          <line
            key={`conn-${index}`}
            x1={fromNode.x + 50}
            y1={fromNode.y + 25}
            x2={toNode.x + 50}
            y2={toNode.y + 25}
            stroke="#9ca3af"
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
          />
        )
      })}

      {/* Nodes */}
      {nodes.map((node) => (
        <g
          key={node.id}
          onMouseDown={(e) => handleMouseDown(e, node.id)}
          onClick={() => onNodeSelect?.(node.id)}
          className="cursor-pointer transition-opacity hover:opacity-80"
        >
          <rect
            x={node.x}
            y={node.y}
            width={100}
            height={50}
            rx={8}
            fill={getNodeColor(node.kind)}
            stroke={dragging === node.id ? '#000' : 'transparent'}
            strokeWidth={2}
          />
          <text
            x={node.x + 50}
            y={node.y + 25}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={12}
            fontWeight={500}
          >
            {node.title}
          </text>
        </g>
      ))}
    </svg>
  )
}
