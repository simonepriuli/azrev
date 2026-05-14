import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { error: Error | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AzRev]', error, info.componentStack)
  }

  render() {
    if (this.state.error != null) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <h1 className="text-lg font-semibold text-red-600">Something went wrong</h1>
        <pre className="scroll-viewport mt-4 overflow-auto rounded-lg border border-slate-200 bg-white p-4 font-mono text-sm text-slate-700 shadow-sm">
          {this.state.error.message}
        </pre>
        <button
          type="button"
          className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => this.setState({ error: null })}
        >
          Try again
        </button>
      </div>
    )
    }
    return this.props.children
  }
}
