import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, apartmentId, apartmentName, apartmentAddress, apartmentInviteCode, apartmentCity, userRole, logout } = useAuth();

  const [membersCount, setMembersCount] = useState(0);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!apartmentId) return;
    const fetchMembers = async () => {
      const { count } = await supabase
        .from('members')
        .select('id', { count: 'exact' })
        .eq('apartment_id', apartmentId);
      setMembersCount(count || 0);
    };
    fetchMembers();
  }, [apartmentId]);

  useEffect(() => {
    if (!apartmentId) return;
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('members')
        .select('user_id, role')
        .eq('apartment_id', apartmentId);
      setMembers(data || []);
    };
    fetchMembers();
  }, [apartmentId]);

  const handlePasswordChange = () => {
    console.log('Change password clicked');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLeaveApartment = async () => {
    const confirmed = window.confirm(
      'האם אתם בטוחים שברצונכם לעזוב את הדירה?'
    );
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('user_id', user.id)
        .eq('apartment_id', apartmentId);
      if (error) throw error;
      alert('עזבתם את הדירה בהצלחה');
      window.location.href = '/onboarding';
    } catch (err) {
      alert('שגיאה: ' + err.message);
    }
  };

  const fullName = user?.user_metadata?.full_name || 'משתמש';
  const initials = fullName.substring(0, 2);

  return (
    <div className="profile-page-wrapper">
      <h1 className="profile-page-title">פרופיל</h1>

      {/* 1. USER CARD */}
      <section className="profile-card user-card">
        <div className="user-card-content">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <h2 className="user-name">{fullName}</h2>
            <p className="user-email">{user?.email || ''}</p>
            <span className="user-role-badge">
              {userRole === 'admin' ? 'מנהל דירה' : 'שותף/ה'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. APARTMENT CARD */}
      <section className="profile-card apartment-card">
        <h3 className="card-section-header">פרטי הדירה</h3>
        
        <div className="info-row">
          <span className="info-label">שם הדירה</span>
          <span className="info-value">{apartmentName || 'לא מוגדר'}</span>
        </div>

        <div className="info-row">
          <span className="info-label">כתובת הדירה</span>
          <span className="info-value">{apartmentAddress || 'לא מוגדר'}</span>
        </div>

        <div className="info-row">
          <span className="info-label">עיר</span>
          <span className="info-value">{apartmentCity || 'לא מוגדר'}</span>
        </div>
        
        <div className="info-row">
          <span className="info-label">מספר שותפים</span>
          <span className="info-value">{membersCount} שותפים</span>
        </div>
        
        <div className="info-row no-border">
          <span className="info-label">קוד הזמנה</span>
          <span className="info-value invite-code">{apartmentInviteCode || 'לא מוגדר'}</span>
        </div>
      </section>

      {/* 3. ROOMMATES CARD */}
      <section className="profile-card roommates-card">
        <h3 className="card-section-header">שותפים בדירה</h3>
        {members.map((member, idx) => (
          <div key={member.user_id} 
            className={`roommate-row ${idx === members.length - 1 ? 'no-border' : ''}`}>
            <div className="roommate-left">
              <div className={`roommate-avatar ${member.role === 'admin' ? 'bg-dark' : 'bg-lime'}`}>
                {member.user_id.substring(0, 2).toUpperCase()}
              </div>
              <span className="roommate-name">
                {member.user_id === user?.id ? 
                  (user?.user_metadata?.full_name || 'את/ה') : 
                  `שותף ${idx + 1}`}
              </span>
              {member.user_id === user?.id && 
                <span className="self-badge">את/ה</span>}
            </div>
            <div className="roommate-right">
              <span className={`role-tag ${member.role === 'admin' ? 'admin' : 'member'}`}>
                {member.role === 'admin' ? 'מנהל' : 'שותף/ה'}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* 4. ACTIONS CARD */}
      <section className="profile-card actions-card">
        <h3 className="card-section-header">פעולות</h3>
        <div className="actions-buttons-container">
          <button 
            type="button" 
            className="action-btn change-password-btn"
            onClick={handlePasswordChange}
          >
            שינוי סיסמה
          </button>
          <button 
            type="button" 
            className="action-btn leave-apartment-btn"
            onClick={handleLeaveApartment}
          >
            עזוב דירה
          </button>
          <button 
            type="button" 
            className="action-btn logout-btn"
            onClick={handleLogout}
          >
            התנתקות
          </button>
        </div>
      </section>

    </div>
  );
}
