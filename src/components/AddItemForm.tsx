import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  userId: string
  onAdded: () => void
}

export function AddItemForm({ userId, onAdded }: Props) {
  const [name, setName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.from('items').insert({
      user_id: userId,
      name,
      expiry_date: expiryDate,
    })

    if (error) {
      setError(error.message)
    } else {
      setName('')
      setExpiryDate('')
      onAdded()
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="add-item-form">
      <input
        type="text"
        placeholder="Item name (e.g. Milk)"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      <input
        type="date"
        value={expiryDate}
        onChange={e => setExpiryDate(e.target.value)}
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add Item'}
      </button>
    </form>
  )
}
