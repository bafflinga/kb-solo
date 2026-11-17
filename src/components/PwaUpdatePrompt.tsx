import { useRegisterSW } from 'virtual:pwa-register/react'
import PwaUpdatePromptView from './PwaUpdatePromptView'

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  return (
    <PwaUpdatePromptView
      needRefresh={needRefresh}
      offlineReady={offlineReady}
      onReload={() => {
        setNeedRefresh(false)
        void updateServiceWorker()
      }}
      onDismissUpdate={() => setNeedRefresh(false)}
      onDismissOffline={() => setOfflineReady(false)}
    />
  )
}
