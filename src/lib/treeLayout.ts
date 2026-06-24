import type { Person } from '@/data/types'

// Geometry of the positioned (editable) chart. The static flexbox tree lays
// itself out with CSS, but a draggable chart needs real numbers per node so the
// SVG reporting lines can be drawn — and re-routed — from actual coordinates.
export const NODE_W = 240 // card width (matches the w-60 cards in the static tree)
export const NODE_H = 176 // vertical slot per node (card + the "Reports to" control)
export const H_GAP = 28 // horizontal breathing room between sibling subtrees
export const V_GAP = 44 // vertical gap between a manager row and its reports

export interface Child {
  person: Person
  mentee: boolean
}

/** Resolves a manager's children by name. Lets the layout run over the sheet's
 *  hierarchy OR an override-adjusted one (after a "Reports to" change). */
export type GetChildren = (name: string) => Child[]

export interface LaidOutNode {
  /** Stable, unique id (a path of slugs). Names/slugs alone aren't unique —
   *  open roles like "[Senior PD]" repeat — so this is the identity used for
   *  React keys and the tidy-seed position lookup. */
  id: string
  person: Person
  mentee: boolean
  depth: number
  x: number
  y: number
}

/** A reporting (or mentorship) link, manager → person, by node id. */
export interface Edge {
  fromId: string
  toId: string
  mentee: boolean
}

export interface OrgLayout {
  nodes: LaidOutNode[]
  edges: Edge[]
  width: number
  height: number
}

/**
 * Tidy top-down tree layout: every subtree claims exactly the horizontal span
 * its leaves need, and each manager is centred over the block of its children.
 * Pure + deterministic — the seed positions the editable chart starts from.
 * Guards against cycles defensively (the UI also prevents them at the source).
 */
export function computeLayout(root: Person, getChildren: GetChildren): OrgLayout {
  const widthCache = new Map<string, number>()
  const widthStack = new Set<string>() // breaks any width recursion cycle
  const subtreeWidth = (name: string): number => {
    const cached = widthCache.get(name)
    if (cached != null) return cached
    if (widthStack.has(name)) return NODE_W // re-entrant → treat as leaf
    widthStack.add(name)
    const kids = getChildren(name)
    const w =
      kids.length === 0
        ? NODE_W
        : Math.max(
            NODE_W,
            kids.reduce((sum, k) => sum + subtreeWidth(k.person.name), 0) + H_GAP * (kids.length - 1),
          )
    widthStack.delete(name)
    widthCache.set(name, w)
    return w
  }

  const nodes: LaidOutNode[] = []
  const placed = new Map<string, LaidOutNode>()
  const edges: Edge[] = []
  let maxDepth = 0

  // Place children left→right, then centre the parent over them. `ancestors`
  // carries the names on the current path so a cycle can't recurse forever.
  const place = (
    person: Person,
    mentee: boolean,
    depth: number,
    leftX: number,
    id: string,
    ancestors: Set<string>,
  ) => {
    maxDepth = Math.max(maxDepth, depth)
    const y = depth * (NODE_H + V_GAP)
    const kids = getChildren(person.name).filter((k) => !ancestors.has(k.person.name))

    let x: number
    if (kids.length === 0) {
      x = leftX
    } else {
      const nextAncestors = new Set(ancestors).add(person.name)
      let cursor = leftX
      const seen = new Map<string, number>()
      const childIds: string[] = []
      for (const k of kids) {
        // Path-based id, disambiguated when a slug repeats under one parent.
        const base = `${id}/${k.person.slug}`
        const n = seen.get(base) ?? 0
        seen.set(base, n + 1)
        const childId = n === 0 ? base : `${base}#${n}`
        childIds.push(childId)
        place(k.person, k.mentee, depth + 1, cursor, childId, nextAncestors)
        edges.push({ fromId: id, toId: childId, mentee: k.mentee })
        cursor += subtreeWidth(k.person.name) + H_GAP
      }
      const first = placed.get(childIds[0])!
      const last = placed.get(childIds[childIds.length - 1])!
      x = (first.x + last.x) / 2
    }

    const node: LaidOutNode = { id, person, mentee, depth, x, y }
    nodes.push(node)
    placed.set(id, node)
  }

  place(root, false, 0, 0, root.slug, new Set())

  return {
    nodes,
    edges,
    width: subtreeWidth(root.name),
    height: (maxDepth + 1) * NODE_H + maxDepth * V_GAP,
  }
}

export const edgeKey = (e: Edge): string => `${e.fromId} ${e.toId}`

/** Orthogonal elbow from a manager's bottom-centre to a report's top-centre. */
export function edgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const x1 = from.x + NODE_W / 2
  const y1 = from.y + NODE_H
  const x2 = to.x + NODE_W / 2
  const y2 = to.y
  const midY = y1 + Math.max(20, (y2 - y1) / 2)
  return `M${x1} ${y1} V${midY} H${x2} V${y2}`
}
