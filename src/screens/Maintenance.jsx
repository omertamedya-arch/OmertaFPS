import { useState } from 'react'
import { cn } from '../lib/format'
import { Icon } from '../components/Icons'
import Cleanup from './Cleanup'
import Ram from './Ram'

const TABS = [
  { id: 'cleanup', label: 'Çöp Temizliği', icon: 'trash' },
  { id: 'ram', label: 'RAM Bakımı', icon: 'memory' }
]

export default function Maintenance(props) {
  const [tab, setTab] = useState('cleanup')
  const Active = tab === 'ram' ? Ram : Cleanup

  return (
    <>
      <div className="mb-5 inline-flex rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        {TABS.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-2 text-[11.5px] font-medium transition',
                active ? 'bg-ion/10 text-white shadow-[inset_0_0_0_1px_rgba(59,167,255,0.16)]' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Icon name={item.icon} className="h-3.5 w-3.5" />
              {item.label}
            </button>
          )
        })}
      </div>

      <div key={tab} className="animate-fade-in">
        <Active {...props} />
      </div>
    </>
  )
}
