const UnderRepair = () => {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ 
        color: '#333',
        marginBottom: '20px',
        fontSize: '2.5rem'
      }}>
        🛠️ Site Under Maintenance
      </h1>
      <p style={{
        color: '#666',
        maxWidth: '600px',
        lineHeight: '1.6',
        fontSize: '1.1rem'
      }}>
        We&apos;re currently performing some maintenance to improve your experience.
        Please check back soon.
      </p>
    </div>
  );
};

export default UnderRepair;
