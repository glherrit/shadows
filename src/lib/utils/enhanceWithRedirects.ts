import { applyAction, type SubmitFunction } from '$app/forms'

const enhanceWithRedirects: SubmitFunction = () => {
  return ({ result }) => {
    // invalidateAll() + goto() will not work
    if (result.type === 'redirect') {
      window.location.href = result.location
    } else {
      applyAction(result)
    }
  }
}

export default enhanceWithRedirects
