// Rig sub-tutorials: the five Live2D Cubism Editor tutorials that live UNDER the
// Rig stage (Preparing to Move the Illustration -> Creating Animations). Each is
// a standalone tutorial page sharing the same `article` schema as the pipeline
// stage articles. Edit the individual files to change content.

import { preparing } from './preparing'
import { expression } from './expression'
import { deformer } from './deformer'
import { xy } from './xy'
import { animator } from './animator'

export const rigTutorials = [preparing, expression, deformer, xy, animator]

// Sidebar links (id + label) for nesting under the Rig node in the docs tree.
export const rigTutorialLinks = rigTutorials.map((t) => ({ id: t.id, label: t.label }))

// Resolve an active page id to its tutorial, or null if it is not one.
export function findRigTutorial(id) {
  return rigTutorials.find((t) => t.id === id) || null
}
