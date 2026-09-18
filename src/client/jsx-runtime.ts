/**
 * Adapter for the automatic JSX runtime. Rolldown compiles JSX to
 * `react/jsx-runtime` imports; the dsh platform seed table only exposes the
 * `react` module, so the client build aliases `react/jsx-runtime` here and this
 * shim forwards to the seeded instance.
 */
import React, { type ReactElement } from 'react'

export const Fragment = React.Fragment

type Props = Record<string, unknown> | null

function create(type: unknown, props: Props, key: unknown): ReactElement {
  const { children, ...rest } = props ?? {}
  const withKey = key === undefined ? rest : { ...rest, key }
  return children === undefined
    ? React.createElement(type as never, withKey as never)
    : React.createElement(type as never, withKey as never, children as never)
}

export { create as jsx, create as jsxs }
