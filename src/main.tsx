import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'
import { DiffWorkerProvider } from './providers/DiffWorkerProvider.tsx'
import App from './App.tsx'
import './index.css'

if (typeof window !== 'undefined' && window.azrev?.nativeVibrancyEnabled === true) {
  document.documentElement.classList.add('electron-mac-vibrancy')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <DiffWorkerProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </DiffWorkerProvider>
    </QueryClientProvider>
  </AppErrorBoundary>,
)
