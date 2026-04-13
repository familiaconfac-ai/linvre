type Variant = 'success' | 'error' | 'warning' | 'info'

interface Props {
  variant: Variant
  message: string
  className?: string
}

const styles: Record<Variant, string> = {
  success: 'bg-green-50 border-green-200 text-green-700',
  error: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
}

export default function InlineMessage({ variant, message, className = '' }: Props) {
  if (!message) return null
  return (
    <div
      className={`border rounded-lg px-4 py-2.5 text-sm ${styles[variant]} ${className}`}
    >
      {message}
    </div>
  )
}
