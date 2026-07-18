import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Badge from '../components/Badge/Badge';
import Toast from '../components/Toast/Toast';
import './ProfilePage.css';

const SUCCESS_TOAST_MS = 2200;

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
  const [toast, setToast] = useState({
    open: false,
    message: '',
    type: 'success',
  });

  const showToast = (message, type = 'success') => {
    setToast({ open: true, message, type });
  };

  const handleToastClose = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    if (!apartmentId) return;
    const fetchApartment = async () => {
      const { data } = await supabase
        .from('apartments')
        .select(
          'name, street, building_number, apartment_number, invite_code, city'
        )
        .eq('id', apartmentId)
        .maybeSingle();
      if (data) setApartmentData(data);
    };
    fetchApartment();
  }, [apartmentId]);

  useEffect(() => {
    if (!apartmentId) return;
    const fetchMembers = async () => {
      const { data: membersData, error } = await supabase.rpc(
        'get_apartment_members',
        { apt_id: apartmentId }
      );

      if (error) {
        console.error('Error fetching apartment members:', error);
        return;
      }
      if (!membersData) return;

      setMembersCount(membersData.length);
      setMembers(membersData);
    };
    fetchMembers();
  }, [apartmentId]);

  const handlePasswordChange = async () => {
    const newPassword = window.prompt('הזינו סיסמה חדשה (לפחות 8 תווים):');
    if (newPassword === null) return;
    if (newPassword.length < 8) {
      showToast('הסיסמה חייבת להכיל לפחות 8 תווים', 'error');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      showToast('הסיסמה עודכנה בהצלחה');
    } catch (err) {
      showToast('שגיאה בעדכון סיסמה: ' + err.message, 'error');
    }
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

    if (userRole === 'admin') {
      const adminCount = members.filter((m) => m.role === 'admin').length;
      if (adminCount <= 1 && members.length > 1) {
        showToast(
          'אתם המנהלים היחידים. העבירו תפקיד מנהל לשותף אחר לפני העזיבה.',
          'error'
        );
        return;
      }
      if (members.length <= 1) {
        const leaveAlone = window.confirm(
          'אתם החברים היחידים בדירה. בעזיבה הדירה תישאר ללא חברים. להמשיך?'
        );
        if (!leaveAlone) return;
      }
    }

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('user_id', user.id)
        .eq('apartment_id', apartmentId);
      if (error) throw error;
      showToast('עזבתם את הדירה בהצלחה');
      window.location.href = '/onboarding';
    } catch (err) {
      showToast('שגיאה: ' + err.message, 'error');
    }
  };

  const handleOpenEdit = () => {
    if (userRole !== 'admin') {
      showToast('רק מנהל הדירה יכול לערוך את פרטי הדירה', 'error');
      return;
    }
    setEditName(apartmentData?.name || '');
    setEditCity(apartmentData?.city || '');
    setEditStreet(apartmentData?.street || '');
    setEditBuilding(apartmentData?.building_number || '');
    setEditApartmentNum(apartmentData?.apartment_number || '');
    setIsEditingApartment(true);
  };

  const handleSaveApartment = async () => {
    if (userRole !== 'admin') {
      showToast('רק מנהל הדירה יכול לערוך את פרטי הדירה', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('apartments')
        .update({
          name: editName,
          city: editCity,
          street: editStreet,
          building_number: editBuilding,
          apartment_number: editApartmentNum,
        })
        .eq('id', apartmentId);

      if (error) throw error;

      setApartmentData((prev) => ({
        ...prev,
        name: editName,
        city: editCity,
        street: editStreet,
        building_number: editBuilding,
        apartment_number: editApartmentNum,
      }));
      setIsEditingApartment(false);
      showToast('פרטי הדירה עודכנו בהצלחה!');
    } catch (err) {
      showToast('שגיאה: ' + err.message, 'error');
    }
  };

  const fullName = user?.user_metadata?.full_name || 'משתמש';
  const initials = fullName.substring(0, 2);

  const roommateDisplayName = (member) => {
    if (member.user_id === user?.id) {
      return user?.user_metadata?.full_name || member.full_name || 'את/ה';
    }
    const name = (member.full_name || '').trim();
    return name || 'שותף ללא שם';
  };

  const roommateInitials = (member) => {
    const name = roommateDisplayName(member);
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="profile-page-wrapper">
      <h1 className="profile-page-title">פרופיל</h1>

      <section className="profile-card user-card">
        <div className="user-card-content">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <h2 className="user-name">{fullName}</h2>
            <p className="user-email">{user?.email || ''}</p>
            <Badge className="user-role-badge-slot">
              {userRole === 'admin' ? 'מנהל דירה' : 'שותף/ה'}
            </Badge>
          </div>
        </div>
      </section>

      <section className="profile-card apartment-card">
        <div className="card-header-row">
          <h2 className="card-title">פרטי הדירה</h2>
          {apartmentId && userRole === 'admin' && (
            <button className="edit-apartment-btn" onClick={handleOpenEdit}>
              ✏️ עריכה
            </button>
          )}
        </div>

        <div className="info-row">
          <span className="info-label">שם הדירה</span>
          <span className="info-value">
            {apartmentData?.name || 'לא מוגדר'}
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">כתובת הדירה</span>
          <span className="info-value">
            {apartmentData
              ? `${apartmentData.street || ''} ${apartmentData.building_number || ''}, דירה ${apartmentData.apartment_number || ''}`
              : 'לא מוגדר'}
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">עיר</span>
          <span className="info-value">
            {apartmentData?.city || 'לא מוגדר'}
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">מספר שותפים</span>
          <span className="info-value">{membersCount} שותפים</span>
        </div>

        <div className="info-row no-border">
          <span className="info-label">קוד הזמנה</span>
          <Badge variant="code">
            {apartmentData?.invite_code || 'לא מוגדר'}
          </Badge>
        </div>
      </section>

      <section className="profile-card roommates-card">
        <h3 className="card-section-header">שותפים בדירה</h3>
        {members.map((member, idx) => (
          <div
            key={member.user_id}
            className={`roommate-row ${idx === members.length - 1 ? 'no-border' : ''}`}
          >
            <div className="roommate-left">
              <div
                className={`roommate-avatar ${member.role === 'admin' ? 'bg-dark' : 'bg-lime'}`}
              >
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt=""
                    className="roommate-avatar-img"
                  />
                ) : (
                  roommateInitials(member)
                )}
              </div>
              <span className="roommate-name">
                {roommateDisplayName(member)}
              </span>
              {member.user_id === user?.id && (
                <span className="self-badge">את/ה</span>
              )}
            </div>
            <div className="roommate-right">
              <Badge>
                {member.role === 'admin' ? 'מנהל' : 'שותף/ה'}
              </Badge>
            </div>
          </div>
        ))}
      </section>

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
        <div
          className="modal-overlay"
          onClick={() => setIsEditingApartment(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">עריכת פרטי דירה</h2>

            <div className="modal-field">
              <label>שם הדירה</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label>עיר</label>
              <input
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label>רחוב</label>
              <input
                value={editStreet}
                onChange={(e) => setEditStreet(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label>מספר בניין</label>
              <input
                value={editBuilding}
                onChange={(e) => setEditBuilding(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label>מספר דירה</label>
              <input
                value={editApartmentNum}
                onChange={(e) => setEditApartmentNum(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-save-btn"
                onClick={handleSaveApartment}
              >
                שמור שינויים
              </button>
              <button
                className="modal-cancel-btn"
                onClick={() => setIsEditingApartment(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        duration={toast.type === 'success' ? SUCCESS_TOAST_MS : 3500}
        onClose={handleToastClose}
      />
    </div>
  );
}
