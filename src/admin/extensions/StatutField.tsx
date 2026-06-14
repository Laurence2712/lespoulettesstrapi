const CONFIG = {
  en_attente: { label: '⏳ En attente', color: '#92400e', bg: '#fef3c7', border: '#f59e0b' },
  payé:       { label: '✅ Payé',        color: '#065f46', bg: '#d1fae5', border: '#10b981' },
  confirmee:  { label: '📦 Confirmée',   color: '#1e40af', bg: '#dbeafe', border: '#3b82f6' },
  expediee:   { label: '🚚 Expédiée',    color: '#5b21b6', bg: '#ede9fe', border: '#8b5cf6' },
  annulee:    { label: '❌ Annulée',     color: '#991b1b', bg: '#fee2e2', border: '#ef4444' },
} as const;

type StatutKey = keyof typeof CONFIG;

interface Props {
  value?: string;
  onChange?: (event: { target: { name: string; value: string; type: string } }) => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
}

const StatutField = ({ value, onChange, name = 'statut', disabled }: Props) => {
  const cfg = CONFIG[value as StatutKey] ?? { label: value || '—', color: '#666', bg: '#f5f5f5', border: '#ccc' };

  if (disabled) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 14px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 700,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        width: 'fit-content',
      }}>
        {cfg.label}
      </span>
    );
  }

  return (
    <select
      name={name}
      value={value ?? ''}
      onChange={(e) => onChange?.({ target: { name, value: e.target.value, type: 'select' } })}
      style={{
        border: `2px solid ${cfg.border}`,
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '14px',
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        cursor: 'pointer',
        maxWidth: '260px',
      }}
    >
      <option value="">— Choisir un statut —</option>
      {(Object.keys(CONFIG) as StatutKey[]).map((key) => (
        <option key={key} value={key}>{CONFIG[key].label}</option>
      ))}
    </select>
  );
};

export default StatutField;
