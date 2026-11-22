import { useState } from 'react'
import { createList, deleteList, updateList } from '../db/repo'
import { INBOX_ID, type ColorName, type List } from '../db/types'
import { ColorPicker } from './controls'
import { Group } from './Group'
import { Sheet } from './Sheet'
import f from './Form.module.css'

export function ListEditor({ list, onClose, onDeleted }: { list?: List; onClose: () => void; onDeleted?: () => void }) {
  const [name, setName] = useState(list?.name ?? '')
  const [color, setColor] = useState<ColorName>(list?.color ?? 'blue')

  async function save() {
    if (list) await updateList(list.id, { name, color })
    else await createList(name, color)
    onClose()
  }

  async function remove() {
    if (!list || !confirm(`¿Eliminar "${list.name}" y todas sus tareas?`)) return
    await deleteList(list.id)
    onDeleted?.()
  }

  return (
    <Sheet title={list ? 'Editar lista' : 'Nueva lista'} onCancel={onClose} confirm={{ label: list ? 'Guardar' : 'Crear', onClick: save, disabled: !name.trim() }}>
      <Group>
        <input className={f.field} placeholder="Nombre" value={name} autoFocus={!list} onChange={(e) => setName(e.target.value)} aria-label="Nombre" />
      </Group>
      <Group header="Color">
        <ColorPicker value={color} onChange={setColor} />
      </Group>
      {list && list.id !== INBOX_ID && <button type="button" className={f.dangerButton} onClick={remove}>Eliminar lista</button>}
    </Sheet>
  )
}
