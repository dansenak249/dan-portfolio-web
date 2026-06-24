'use client'

import Article from './Article'

// Standalone tutorial page for a Rig sub-tutorial (Preparing to Move the
// Illustration, Adding Facial Expressions, etc.). Mirrors the StageDoc header +
// article layout but without tools/handoff, since these are pure tutorials.
export default function TutorialDoc({ tutorial }) {
  return (
    <article style={{ '--accent': tutorial.accent }}>
      <h1 className="text-4xl font-bold leading-tight text-[#2d2d3a]">{tutorial.label}</h1>
      {tutorial.sub && <p className="mt-2 text-base italic text-[#6b6b8a]">{tutorial.sub}</p>}
      <Article article={tutorial.article} accent={tutorial.accent} />
    </article>
  )
}
