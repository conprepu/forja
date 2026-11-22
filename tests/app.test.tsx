import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../src/app/routes'
import { TABS } from '../src/app/tabs'

function render(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return renderToString(<RouterProvider router={router} />)
}

describe('app shell', () => {
  it('muestra las 5 tabs en orden', () => {
    expect(TABS.map((t) => t.label)).toEqual(['Hoy', 'Entreno', 'Comida', 'Progreso', 'Perfil'])
    const html = render('/hoy')
    for (const { path } of TABS) expect(html).toContain(`href="${path}"`)
  })

  it.each([
    ['/hoy', 'Hoy'],
    ['/entreno', 'Entreno'],
    ['/comida', 'Comida'],
    ['/progreso', 'Progreso'],
    ['/perfil', 'Perfil'],
  ])('%s abre la pantalla %s y marca su tab', (path, title) => {
    const html = render(path)
    expect(html).toContain(`<h1>${title}</h1>`)
    expect(html).toMatch(new RegExp(`aria-current="page"[^>]*href="${path}"|href="${path}"[^>]*aria-current="page"`))
  })

  it('las rutas desconocidas no truenan', () => {
    expect(() => render('/no-existe')).not.toThrow()
  })
})
