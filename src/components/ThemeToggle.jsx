import { useRef } from 'react'
import { useTheme } from '../theme/ThemeContext.jsx'

const options = [
  { value: 'light', label: 'Light', icon: 'fas fa-sun' },
  { value: 'dark', label: 'Dark', icon: 'fas fa-moon' },
  { value: 'system', label: 'System', icon: 'fas fa-desktop' },
]

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, mounted } = useTheme()
  const buttonRefs = useRef([])

  if (!mounted) {
    return <div className="theme-toggle theme-toggle-loading" aria-hidden="true" />
  }

  const handleKeyDown = (event, currentIndex) => {
    let nextIndex
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % options.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + options.length) % options.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = options.length - 1
    } else {
      return
    }

    event.preventDefault()
    const nextOption = options[nextIndex]
    setTheme(nextOption.value)
    buttonRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="theme-toggle-wrap">
      <div className="theme-toggle" role="radiogroup" aria-label="Color theme">
        {options.map((option, index) => (
          <button
            key={option.value}
            ref={(element) => {
              buttonRefs.current[index] = element
            }}
            type="button"
            className={`theme-toggle-option${theme === option.value ? ' active' : ''}`}
            role="radio"
            aria-checked={theme === option.value}
            aria-label={`${option.label} theme`}
            tabIndex={theme === option.value ? 0 : -1}
            onClick={() => setTheme(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <i className={option.icon} aria-hidden="true"></i>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        Theme set to {theme}. {theme === 'system' ? `Currently ${resolvedTheme} mode.` : ''}
      </span>
    </div>
  )
}
