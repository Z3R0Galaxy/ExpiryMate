import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Item {
  id: string
  name: string
  expiry_date: string
}

type Status = 'expired' | 'soon' | 'fresh'

function getStatus(expiryDate: string): Status {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  const daysLeft = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 7) return 'soon'
  return 'fresh'
}

const STATUS_LABEL: Record<Status, string> = {
  expired: 'Expired',
  soon: 'Expiring soon',
  fresh: 'Fresh',
}

const STATUS_CLASS: Record<Status, string> = {
  expired: 'status-expired',
  soon: 'status-soon',
  fresh: 'status-fresh',
}

interface Props {
  userId: string
  refresh: number
}

export function ItemList({ userId, refresh }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')

  useEffect(() => {
    async function fetchItems() {
      setLoading(true)
      const { data } = await supabase
        .from('items')
        .select('id, name, expiry_date')
        .eq('user_id', userId)
        .order('expiry_date', { ascending: true })
      if (data) setItems(data)
      setLoading(false)
    }
    fetchItems()
  }, [userId, refresh])

  async function deleteItem(id: string) {
    await supabase.from('items').delete().eq('id', id)
    setItems(prev => prev.filter(item => item.id !== id))
  }

  function startEdit(item: Item) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditDate(item.expiry_date)
  }

  async function saveEdit(id: string) {
    const { error } = await supabase
      .from('items')
      .update({ name: editName, expiry_date: editDate })
      .eq('id', id)
    if (!error) {
      setItems(prev =>
        prev.map(item => item.id === id ? { ...item, name: editName, expiry_date: editDate } : item)
      )
      setEditingId(null)
    }
  }

  if (loading) return <p>Loading items...</p>
  if (items.length === 0) return <p className="empty">No items yet. Add one above!</p>

  return (
    <ul className="item-list">
      {items.map(item => {
        const status = getStatus(item.expiry_date)
        return (
          <li key={item.id} className={`item-row ${STATUS_CLASS[status]}`}>
            {editingId === item.id ? (
              <div className="item-edit">
                <input value={editName} onChange={e => setEditName(e.target.value)} />
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                <button onClick={() => saveEdit(item.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <div className="item-view">
                <span className={`status-badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
                <span className="item-name">{item.name}</span>
                <span className="item-date">expires {item.expiry_date}</span>
                <button onClick={() => startEdit(item)}>Edit</button>
                <button onClick={() => deleteItem(item.id)}>Delete</button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
