import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const SystemStatus = () => {
  const [status, setStatus] = useState({
    api: 'checking',
    database: 'checking',
    lastChecked: null
  });

  const checkSystemHealth = async () => {
    try {
      // Set checking status
      setStatus(prev => ({
        ...prev,
        api: 'checking',
        database: 'checking'
      }));

      // Check API health
      const apiHealth = await apiService.getHealthStatus();
      
      // Check database health (now public, no authentication required)
      let databaseStatus = 'unavailable';
      
      try {
        const dbHealth = await apiService.getDatabaseHealth();
        
        if (dbHealth.success && dbHealth.data?.status === 'CONNECTED') {
          databaseStatus = 'online';
        } else {
          databaseStatus = 'offline';
        }
      } catch (dbError) {
        console.warn('Database health check failed:', dbError);
        databaseStatus = 'offline';
      }

      setStatus({
        api: apiHealth.success ? 'online' : 'offline',
        database: databaseStatus,
        lastChecked: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.warn('System health check failed:', error);
      setStatus(prev => ({
        ...prev,
        api: 'offline',
        database: 'offline',
        lastChecked: new Date().toLocaleTimeString()
      }));
    }
  };

  useEffect(() => {
    // Check immediately on mount
    checkSystemHealth();

    // Check every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (statusType) => {
    switch (statusType) {
      case 'online':
        return <i className="fas fa-circle text-success" title="Online"></i>;
      case 'offline':
        return <i className="fas fa-circle text-danger" title="Offline"></i>;
      case 'checking':
        return <i className="fas fa-circle text-warning" title="Checking..."></i>;
      case 'unavailable':
        return <i className="fas fa-minus-circle text-muted" title="Unavailable"></i>;
      default:
        return <i className="fas fa-circle text-secondary" title="Unknown"></i>;
    }
  };

  const getStatusText = (statusType) => {
    switch (statusType) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'checking':
        return 'Checking...';
      case 'unavailable':
        return 'Unavailable';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="system-status">
      <div className="d-flex align-items-center gap-3 flex-wrap">
        <div className="status-item">
          {getStatusIcon(status.api)}
          <span className="ms-1 small">API: {getStatusText(status.api)}</span>
        </div>
        <div className="status-item">
          {getStatusIcon(status.database)}
          <span className="ms-1 small">DB: {getStatusText(status.database)}</span>
        </div>
        {status.lastChecked && (
          <div className="status-item">
            <i className="fas fa-clock text-muted"></i>
            <span className="ms-1 small text-muted">
              Last checked: {status.lastChecked}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemStatus;