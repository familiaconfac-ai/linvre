interface Props {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon = '📭', title, description, action }: Props) {
  return (
    <div className="text-center py-14 bg-white rounded-xl border border-dashed border-gray-200">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-gray-700 font-medium">{title}</p>
      {description && (
        <p className="text-gray-400 text-sm mt-1 mb-5">{description}</p>
      )}
      {action && !description && <div className="mt-5">{action}</div>}
      {action && description && <div>{action}</div>}
    </div>
  )
}
