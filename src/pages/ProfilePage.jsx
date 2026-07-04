import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, apartmentId, userRole, logout } = useAuth();

  const [membersCount, setMembersCount] = useState(0);
  const [members, setMembers] = useState([]);
  const [isEditingApartment, setIsEditingApartment] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editApartmentNum, setEditApartmentNum] = useState('');
  const [apartmentData, setApartmentData] = useState(null);

  useEffect(() => {
    if (!apartmentId) return;
    const fetchApartment = async () => {
      const { data } = await supabase
        .from('apartments')
        .select('name, street, building_number, apartment_number, invite_code, city')
        .eq('id', apartmentId)
        .single();
      if (data) setApartmentData(data);
    };
    fetchApartment();
  }, [apartmentId]);

  useEffect(() => {
    if (!apartmentId) return;
    const fetchMembers = async () => {
      // Fetch members
      const { data: membersData } = await supabase
        .rpc('get_apartment_members', { apt_id: apartmentId });

      if (!membersData) return;

      // Set count
      setMembersCount(membersData.length);

      // Fetch profiles for those user_ids
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Merge members with profiles
      const profileMap = {};
      (profilesData || []).forEach(p => {
        profileMap[p.user_id] = p.full_name;
      });

      const merged = membersData.map(m => ({
        ...m,
        full_name: profileMap[m.user_id] || null
      }));

      setMembers(merged);
    };
    fetchMembers();
  }, [apartmentId]);

  const handlePasswordChange = () => {
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

  const handleOpenEdit = () => {
    setEditName(apartmentData?.name || '');
    setEditCity(apartmentData?.city || '');
    setEditStreet(apartmentData?.street || '');
    setEditBuilding(apartmentData?.building_number || '');
    setEditApartmentNum(apartmentData?.apartment_number || '');
    setIsEditingApartment(true);
  };

  const handleSaveApartment = async () => {
    try {
      const { error } = await supabase
        .from('apartments')
        .update({
          name: editName,
          city: editCity,
          street: editStreet,
          building_number: editBuilding,
          apartment_number: editApartmentNum
        })
        .eq('id', apartmentId);
      
      if (error) throw error;
      
      // Update local state immediately
      setApartmentData(prev => ({
        ...prev,
        name: editName,
        city: editCity,
        street: editStreet,
        building_number: editBuilding,
        apartment_number: editApartmentNum
      }));
      setIsEditingApartment(false);
      alert('פרטי הדירה עודכנו בהצלחה!');
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
        <div className="card-header-row">
          <h2 className="card-title">פרטי הדירה</h2>
          {apartmentId && (
            <button
              className="edit-apartment-btn"
              onClick={handleOpenEdit}
            >
              ✏️ עריכה
            </button>
          )}
        </div>

        <div className="info-row">
          <span className="info-label">שם הדירה</span>
          <span className="info-value">{apartmentData?.name || 'לא מוגדר'}</span>
        </div>

        <div className="info-row">
          <span className="info-label">כתובת הדירה</span>
          <span className="info-value">
            {apartmentData ? `${apartmentData.street || ''} ${apartmentData.building_number || ''}, דירה ${apartmentData.apartment_number || ''}` : 'לא מוגדר'}
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">עיר</span>
          <span className="info-value">{apartmentData?.city || 'לא מוגדר'}</span>
        </div>

        <div className="info-row">
          <span className="info-label">מספר שותפים</span>
          <span className="info-value">{membersCount} שותפים</span>
        </div>

        <div className="info-row no-border">
          <span className="info-label">קוד הזמנה</span>
          <span className="info-value invite-code">{apartmentData?.invite_code || 'לא מוגדר'}</span>
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
                {member.user_id === user?.id ?
                  (user?.user_metadata?.full_name || 'מש').substring(0, 2).toUpperCase() :
                  (member.full_name || 'שו').substring(0, 2).toUpperCase()}
              </div>
              <span className="roommate-name">
                {member.user_id === user?.id ?
                  (user?.user_metadata?.full_name || 'את/ה') :
                  (member.full_name || `שותף ${idx + 1}`)}
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
      {isEditingApartment && (
        <div className="modal-overlay" onClick={() => setIsEditingApartment(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">עריכת פרטי דירה</h2>

            <div className="modal-field">
              <label>שם הדירה</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="modal-field">
              <label>עיר</label>
              <input value={editCity} onChange={e => setEditCity(e.target.value)} />
            </div>
            <div className="modal-field">
              <label>רחוב</label>
              <input value={editStreet} onChange={e => setEditStreet(e.target.value)} />
            </div>
            <div className="modal-field">
              <label>מספר בניין</label>
              <input value={editBuilding} onChange={e => setEditBuilding(e.target.value)} />
            </div>
            <div className="modal-field">
              <label>מספר דירה</label>
              <input value={editApartmentNum} onChange={e => setEditApartmentNum(e.target.value)} />
            </div>

            <div className="modal-actions">
              <button className="modal-save-btn" onClick={handleSaveApartment}>
                שמור שינויים
              </button>
              <button className="modal-cancel-btn" onClick={() => setIsEditingApartment(false)}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
