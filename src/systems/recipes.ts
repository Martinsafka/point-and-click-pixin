import type { ItemId, Recipe } from '../data/schema'

/** The recipe combining `a` + `b` (order-independent), or undefined. */
export function findRecipe(recipes: readonly Recipe[], a: ItemId, b: ItemId): Recipe | undefined {
  return recipes.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))
}
