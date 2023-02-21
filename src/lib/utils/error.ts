import { ClientResponseError } from 'pocketbase'
import { format } from 'svelte-i18n'
import { get } from 'svelte/store'

// mimic svelte syntax
const $_ = get(format)

type ErrorWithMessage = {
  message: string
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError

  try {
    return new Error(JSON.stringify(maybeError))
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError))
  }
}

export function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message
}

export function getFormString(form: FormData, key: string, orValue: string | null = null) {
  const value = form.get(key)
  if (typeof value === 'string') return value
  return orValue
}

function getOneTranslatedError(forKey: string | undefined | null, orValue: string | null = null) {
  return forKey ? $_(forKey, { default: orValue || forKey }) : undefined
}

export function getTranslatedError(
  forKey: string[] | string | undefined | null,
  orValue: string | null = null
) {
  if (Array.isArray(forKey)) {
    const errors = forKey.map((key) => getOneTranslatedError(key, orValue))
    return errors.join(', ')
  }
  return getOneTranslatedError(forKey, orValue)
}

export function getFieldErrorsFromPocketbase(err: unknown) {
  if (err instanceof ClientResponseError && err.data.code === 400) {
    console.debug(`src/lib/utils/error.ts(72): err.data.data :>> `, err.data.data)
    // transform:
    // . username: {
    // .   code: 'validation_length_out_of_range',
    // .   message: 'The length must be between 4 and 100.'
    // . }
    // into: username: ["errors.username.validation_length_out_of_range"]
    const fieldErrorData = (err.data.data || {}) as Record<
      string,
      { code: string; message: string }
    >
    return Object.keys(fieldErrorData).reduce(
      (acc, key) => ({
        ...acc,
        [key]: [`errors.${key}.${fieldErrorData[key].code}`],
      }),
      {} as Record<string, string[]>
    )
  }
}
