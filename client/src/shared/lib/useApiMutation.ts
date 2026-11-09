import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage } from '@/shared/api/client'

/**
 * Mutation wrapper: shows a success toast, invalidates the given query keys,
 * and surfaces the server's error message. Callers render `error` inline in
 * forms/dialogs as well.
 */
export function useApiMutation<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  opts: {
    success?: string | ((r: TResult) => string)
    invalidate?: QueryKey[]
    onSuccess?: (r: TResult, vars: TVars) => void
    toastError?: boolean
  } = {},
) {
  const qc = useQueryClient()
  const m = useMutation({
    mutationFn: fn,
    onSuccess: (result, vars) => {
      for (const key of opts.invalidate ?? []) qc.invalidateQueries({ queryKey: key })
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(result) : opts.success)
      opts.onSuccess?.(result, vars)
    },
    onError: (err) => {
      if (opts.toastError) toast.error(errorMessage(err))
    },
  })
  return { ...m, errorText: m.error ? errorMessage(m.error) : null }
}
