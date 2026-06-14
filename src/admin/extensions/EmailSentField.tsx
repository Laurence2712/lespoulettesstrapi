const EmailSentField = ({ value }: { value?: boolean | null }) => {
  if (value === true) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '5px 14px', borderRadius: '20px',
        fontSize: '13px', fontWeight: 700,
        color: '#065f46', background: '#d1fae5', border: '1px solid #10b981',
      }}>
        ✓ Email envoyé
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '5px 14px', borderRadius: '20px',
      fontSize: '13px', fontWeight: 700,
      color: '#92400e', background: '#fef3c7', border: '1px solid #f59e0b',
    }}>
      ⏳ Non envoyé
    </span>
  );
};

export default EmailSentField;
