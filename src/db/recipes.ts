import { newId } from '../lib/workout'
import type { ForjaDB } from './db'
import type { Recipe } from './schema'

export async function saveRecipe(
  db: ForjaDB,
  data: Omit<Recipe, 'id' | 'name' | 'servings'> & { id?: string; name: string; servings: number },
): Promise<Recipe> {
  const recipe: Recipe = {
    id: data.id ?? newId(),
    name: data.name.trim() || 'Mi receta',
    servings: Math.max(1, data.servings || 1),
    ingredients: data.ingredients.filter((i) => i.grams > 0),
  }
  await db.recipes.put(recipe)
  return recipe
}

export const deleteRecipe = (db: ForjaDB, id: string) => db.recipes.delete(id)
