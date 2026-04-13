// TODO: substituir logo.svg/png por versão final otimizada

import { useState } from 'react'

const sizes = {
  sm: 32,
  md: 40,
  lg: 80,
}

interface Props {
  size?: keyof typeof sizes
  className?: string
}

export default function AppLogo({ size = 'md', className = '' }: Props) {
  const px = sizes[size]
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span className="text-indigo-600 font-bold">LinVre</span>
  }

  const src = '/assets/logo.png'

  return (
    <img
      src={src}
      alt="LinVre"
      height={px}
      style={{ height: px, width: 'auto', objectFit: 'contain' }}
      className={className}
      onError={() => {
        setFailed(true)
      }}
    />
  )
}
