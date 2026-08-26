import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom does not implement scrollIntoView; stub so App smooth-scroll effects are safe in tests.
Element.prototype.scrollIntoView = () => {}

afterEach(() => {
  cleanup()
})
