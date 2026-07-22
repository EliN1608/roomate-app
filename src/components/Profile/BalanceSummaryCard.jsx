import React from 'react';

export default function BalanceSummaryCard({
  balance,
  balanceColor,
  balanceSubtitle,
  onNavigateDashboard,
}) {
  return (
    <section className="profile-card balance-summary-card">
      <div className="balance-summary-top">
        <h2 className="card-title">המאזן האישי שלי</h2>
        <button
          type="button"
          className="balance-dashboard-link"
          onClick={onNavigateDashboard}
        >
          לדשבורד
        </button>
      </div>
      <p className="balance-summary-amount" style={{ color: balanceColor }}>
        {balance}
      </p>
      <p className="balance-summary-subtitle">{balanceSubtitle}</p>
    </section>
  );
}
