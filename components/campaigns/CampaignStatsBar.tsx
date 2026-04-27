interface Stat {
  label: string
  value: number | string
}

interface CampaignStatsBarProps {
  stats: Stat[]
}

export function CampaignStatsBar({ stats }: CampaignStatsBarProps) {
  return (
    <div className="flex flex-wrap gap-6">
      {stats.map(({ label, value }) => (
        <div key={label} className="flex flex-col">
          <span className="text-2xl font-semibold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}
