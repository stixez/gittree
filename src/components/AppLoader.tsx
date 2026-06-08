import { GitBranch } from 'lucide-react'

export function AppLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8 animate-pulse flex flex-col items-center">
          <GitBranch className="w-16 h-16 text-primary mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2 font-sans">
            GitTree
          </h1>
          <p className="text-slate-400">
            Loading beautiful git visualization...
          </p>
        </div>

        <div className="w-64 mx-auto">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-[loading_2s_ease-in-out_infinite]" />
          </div>
        </div>

        <div className="mt-8">
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
