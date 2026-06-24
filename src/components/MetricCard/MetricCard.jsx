import React from 'react';

export default function MetricCard({ title, value, ...props }) {
  return (
    <div className="metric-card" {...props}>
      <h4>{title || 'Metric Title'}</h4>
      <p>{value || '0'}</p>
    </div>
  );
}
