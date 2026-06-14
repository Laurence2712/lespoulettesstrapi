interface Article {
  title: string;
  quantity: number;
  prix: number;
  image_url?: string;
}

const ArticlesField = ({ value }: { value?: string | Article[] | null }) => {
  let items: Article[] = [];
  try {
    items = typeof value === 'string'
      ? JSON.parse(value)
      : Array.isArray(value)
        ? value
        : [];
  } catch {
    items = [];
  }

  if (!items.length) {
    return (
      <div style={{ color: '#8e8ea0', fontStyle: 'italic', padding: '8px 0' }}>
        Aucun article
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + item.prix * item.quantity, 0);

  return (
    <div style={{
      border: '1px solid #dcdce4',
      borderRadius: '4px',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      width: '100%',
    }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderBottom: i < items.length - 1 ? '1px solid #f0f0f3' : 'none',
            background: i % 2 === 0 ? '#fff' : '#fafafa',
          }}
        >
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              style={{
                width: 40,
                height: 40,
                objectFit: 'cover',
                borderRadius: '4px',
                flexShrink: 0,
                border: '1px solid #f0f0f3',
              }}
            />
          ) : (
            <div style={{
              width: 40,
              height: 40,
              background: '#f0f0f3',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}>
              🛍️
            </div>
          )}

          <span style={{ flex: 1, fontWeight: 500, color: '#32324d' }}>
            {item.title}
          </span>

          <span style={{
            background: '#FACC15',
            color: '#1c1c38',
            borderRadius: '12px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            ×{item.quantity}
          </span>

          <span style={{
            fontWeight: 600,
            minWidth: '72px',
            textAlign: 'right',
            flexShrink: 0,
            color: '#32324d',
          }}>
            {(item.prix * item.quantity).toFixed(2)} €
          </span>
        </div>
      ))}

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        background: '#f0f0f3',
        borderTop: '2px solid #dcdce4',
        fontWeight: 700,
        fontSize: '15px',
        color: '#32324d',
      }}>
        <span style={{ color: '#666', fontWeight: 400 }}>Total</span>
        {total.toFixed(2)} €
      </div>
    </div>
  );
};

export default ArticlesField;
