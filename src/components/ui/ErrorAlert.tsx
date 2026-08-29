import { AlertCircle } from 'lucide-react'

export default function ErrorAlert({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 animate-fade-in" role="alert">
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      <p className="text-xs text-red-600 font-body leading-relaxed">{msg}</p>
    </div>
  )
}
