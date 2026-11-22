import { Empty, Screen } from '../../ui/Screen'
import { BackupSection } from './BackupSection'

export function ProfileScreen() {
  return (
    <Screen title="Perfil">
      <Empty>Aquí irán tus datos y metas.</Empty>
      <BackupSection />
    </Screen>
  )
}
