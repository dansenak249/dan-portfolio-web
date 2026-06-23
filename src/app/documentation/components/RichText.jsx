'use client'

import { Fragment } from 'react'
import InlineTerm from './InlineTerm'

// Renders a rich-text token array (see data/pipeline.js). Plain strings render
// as text; { t, label } objects render as an inline glossary term.
export default function RichText({ tokens, onSelect }) {
  return (
    <>
      {tokens.map((token, i) =>
        typeof token === 'string' ? (
          <Fragment key={i}>{token}</Fragment>
        ) : (
          <InlineTerm key={i} id={token.t} label={token.label} onSelect={onSelect} />
        )
      )}
    </>
  )
}
