import { useState } from 'react'
import { Screen } from '../../ui/Screen'
import { Segmented } from '../../ui/Segmented'
import { BodyTab } from './BodyTab'
import { ExercisesTab } from './ExercisesTab'
import { HistoryTab } from './HistoryTab'
import { NutritionTab } from './NutritionTab'
import { SummaryTab } from './SummaryTab'

type Tab = 'resumen' | 'ejercicios' | 'historial' | 'comida' | 'medidas'

export function ProgressScreen() {
  const [tab, setTab] = useState<Tab>('resumen')
  return (
    <Screen title="Progreso">
      <Segmented
        label="Sección de progreso"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'resumen', label: 'Resumen' },
          { value: 'ejercicios', label: 'Ejercicios' },
          { value: 'historial', label: 'Historial' },
          { value: 'comida', label: 'Comida' },
          { value: 'medidas', label: 'Medidas' },
        ]}
      />
      <div className="mt-3">
        {tab === 'resumen' && <SummaryTab />}
        {tab === 'ejercicios' && <ExercisesTab />}
        {tab === 'historial' && <HistoryTab />}
        {tab === 'comida' && <NutritionTab />}
        {tab === 'medidas' && <BodyTab />}
      </div>
    </Screen>
  )
}
