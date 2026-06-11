import { useState, useCallback } from 'react'
import api from '../api/axios'

export function useSajuData() {
  const [step, setStep]             = useState('input')
  const [sajuResult, setSajuResult] = useState(null)
  const [formError, setFormError]   = useState('')

  const refetch = useCallback(() => {
    setStep('input')
    setSajuResult(null)
  }, [])

  return { step, setStep, sajuResult, setSajuResult, formError, setFormError, refetch }
}
