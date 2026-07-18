import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Badge from '../components/Badge/Badge';
import Toast from '../components/Toast/Toast';
import { IconDotsVertical, IconEdit } from '../components/icons/TablerIcons';
import { fetchMyOpenBalance } from '../lib/openBalance';
import { EPS } from '../lib/balances';
import './ProfilePage.css';

const SUCCESS_TOAST_MS = 2200;

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, apartmentId, userRole, logout, refreshApartment } = useAuth();
  const avatarInputRef = useRef(null);

  const [membersCount, setMembersCount] = useState(0);
  const [members, setMembers] = useState([]);
  const [apartmentData, setApartmentData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [balance, setBalance] = useState(0);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [isEditingApartment, setIsEditingApartment] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editApartmentNum, setEditApartmentNum] = useState('');

  const [confirmModal, setConfirmModal] = useState(null);
  // confirmModal: { type, title, body, confirmLabel, danger?, payload? }
  const [memberMenuId, setMemberMenuId] = useState(null);

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

  const fetchMembers = useCallback(async () => {
    if (!apartmentId) return;
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
  }, [apartmentId]);

  const fetchApartment = useCallback(async () => {
    if (!apartmentId) return;
    const { data } = await supabase
      .from('apartments')
      .select(
        'name, street, building_number, apartment_number, invite_code, city'
      )
      .eq('id', apartmentId)
      .maybeSingle();
    if (data) setApartmentData(data);
  }, [apartmentId]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();

    const name =
      data?.full_name?.trim() ||
      user?.user_metadata?.full_name ||
      'משתמש';
    setProfile(data || null);
    setDisplayName(name);
  }, [user?.id, user?.user_metadata?.full_name]);

  const fetchBalance = useCallback(async () => {
    if (!apartmentId || !user?.id) {
      setBalance(0);
      return;
    }
    try {
      const open = await fetchMyOpenBalance(supabase, apartmentId, user.id);
      setBalance(open);
    } catch (err) {
      console.error('Error fetching open balance:', err);
      setBalance(0);
    }
  }, [apartmentId, user?.id]);

  useEffect(() => {
    fetchApartment();
  }, [fetchApartment]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    if (!memberMenuId) return undefined;
    const handlePointerDown = (e) => {
      if (e.target.closest?.(`[data-member-menu="${memberMenuId}"]`)) return;
      setMemberMenuId(null);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMemberMenuId(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [memberMenuId]);

  const fullName = displayName || 'משתמש';
  const initials = fullName.substring(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url || null;

  const roommateDisplayName = (member) => {
    if (member.user_id === user?.id) {
      return displayName || member.full_name || 'את/ה';
    }
    const name = (member.full_name || '').trim();
    return name || 'שותף ללא שם';
  };

  const roommateInitials = (member) => {
    const name = roommateDisplayName(member);
    return name.substring(0, 2).toUpperCase();
  };

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

  const handleStartEditName = () => {
    setNameDraft(displayName);
    setIsEditingName(true);
  };

  const saveProfileFields = async (fields) => {
    if (!user?.id) throw new Error('לא מחוברים');

    const { data: existing } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('profiles')
        .update(fields)
        .eq('user_id', user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        ...fields,
      });
      if (error) throw error;
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      showToast('יש להזין שם תצוגה', 'error');
      return;
    }
    if (!user?.id) return;

    setSavingName(true);
    try {
      await saveProfileFields({ full_name: trimmed });

      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });
      if (authError) throw authError;

      setDisplayName(trimmed);
      setProfile((prev) => ({ ...(prev || {}), full_name: trimmed }));
      setIsEditingName(false);
      await fetchMembers();
      showToast('שם התצוגה עודכן');
    } catch (err) {
      showToast('שגיאה בעדכון שם: ' + err.message, 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarClick = () => {
    if (uploadingAvatar) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      showToast('יש לבחור קובץ תמונה', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('גודל התמונה מוגבל ל־2MB', 'error');
      return;
    }

    const ext =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : file.type === 'image/gif'
            ? 'gif'
            : 'jpg';
    const path = `${user.id}/avatar.${ext}`;

    setUploadingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await saveProfileFields({
        avatar_url: publicUrl,
        full_name: displayName,
      });

      setProfile((prev) => ({ ...(prev || {}), avatar_url: publicUrl }));
      await fetchMembers();
      showToast('תמונת הפרופיל עודכנה');
    } catch (err) {
      showToast('שגיאה בהעלאת תמונה: ' + err.message, 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCopyInviteCode = async () => {
    const code = apartmentData?.invite_code;
    if (!code) {
      showToast('אין קוד הזמנה להעתקה', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      showToast('קוד ההזמנה הועתק');
    } catch {
      showToast('לא ניתן להעתיק ללוח', 'error');
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
      await refreshApartment(user.id);
      showToast('פרטי הדירה עודכנו בהצלחה!');
    } catch (err) {
      showToast('שגיאה: ' + err.message, 'error');
    }
  };

  const openLeaveModal = () => {
    const adminCount = members.filter((m) => m.role === 'admin').length;
    if (userRole === 'admin' && adminCount <= 1 && members.length > 1) {
      showToast(
        'אתם המנהלים היחידים. העבירו תפקיד מנהל לשותף אחר לפני העזיבה.',
        'error'
      );
      return;
    }

    const aloneNote =
      members.length <= 1
        ? ' אתם החברים היחידים בדירה — בעזיבה הדירה תישאר ללא חברים.'
        : '';

    setConfirmModal({
      type: 'leave',
      title: 'עזיבת דירה',
      body: `האם אתם בטוחים שברצונכם לעזוב את הדירה?${aloneNote}`,
      confirmLabel: 'עזוב דירה',
      danger: true,
    });
  };

  const openRegenerateModal = () => {
    if (userRole !== 'admin') {
      showToast('רק מנהל הדירה יכול ליצור קוד מחדש', 'error');
      return;
    }
    setConfirmModal({
      type: 'regenerate',
      title: 'יצירת קוד הזמנה מחדש',
      body: 'הקוד הנוכחי יבוטל. שותפים חדשים יצטרכו את הקוד החדש. להמשיך?',
      confirmLabel: 'צור קוד חדש',
      danger: false,
    });
  };

  const openTransferModal = (member) => {
    setMemberMenuId(null);
    setConfirmModal({
      type: 'transfer',
      title: 'העברת תפקיד מנהל',
      body: `להעביר את תפקיד המנהל ל־${roommateDisplayName(member)}? אתם תהפכו לשותפים רגילים.`,
      confirmLabel: 'העבר תפקיד',
      danger: false,
      payload: { userId: member.user_id },
    });
  };

  const openRemoveModal = (member) => {
    setMemberMenuId(null);
    setConfirmModal({
      type: 'remove',
      title: 'הסרת שותף',
      body: `להסיר את ${roommateDisplayName(member)} מהדירה?`,
      confirmLabel: 'הסר שותף',
      danger: true,
      payload: { userId: member.user_id },
    });
  };

  const handleConfirmModal = async () => {
    if (!confirmModal || !apartmentId || actionBusy) return;
    setActionBusy(true);

    try {
      if (confirmModal.type === 'leave') {
        const { error } = await supabase.rpc('leave_apartment', {
          apt_id: apartmentId,
        });
        if (error) throw error;
        setConfirmModal(null);
        showToast('עזבתם את הדירה בהצלחה');
        await refreshApartment(user.id);
        navigate('/onboarding');
        return;
      }

      if (confirmModal.type === 'regenerate') {
        const { data: newCode, error } = await supabase.rpc(
          'regenerate_invite_code',
          { apt_id: apartmentId }
        );
        if (error) throw error;
        setApartmentData((prev) => ({
          ...prev,
          invite_code: newCode,
        }));
        await refreshApartment(user.id);
        showToast('קוד הזמנה חדש נוצר');
      }

      if (confirmModal.type === 'transfer') {
        const { error } = await supabase.rpc('transfer_apartment_admin', {
          apt_id: apartmentId,
          new_admin_id: confirmModal.payload.userId,
        });
        if (error) throw error;
        await refreshApartment(user.id);
        await fetchMembers();
        showToast('תפקיד המנהל הועבר');
      }

      if (confirmModal.type === 'remove') {
        const { error } = await supabase.rpc('remove_apartment_member', {
          apt_id: apartmentId,
          target_user_id: confirmModal.payload.userId,
        });
        if (error) throw error;
        await fetchMembers();
        showToast('השותף הוסר מהדירה');
      }

      setConfirmModal(null);
    } catch (err) {
      showToast(err.message || 'שגיאה בביצוע הפעולה', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const balanceColor =
    balance > EPS
      ? 'var(--success)'
      : balance < -EPS
        ? 'var(--error)'
        : 'var(--text-primary)';

  const balanceSubtitle =
    balance > EPS
      ? 'השותפים חייבים לך'
      : balance < -EPS
        ? 'אתה חייב לשותפים'
        : 'המאזן מאוזן';

  return (
    <div className="profile-page-wrapper">
      <h1 className="profile-page-title">פרופיל</h1>

      {/* 1. Personal details */}
      <section className="profile-card user-card">
        <div className="user-card-content">
          <button
            type="button"
            className="user-avatar-btn"
            onClick={handleAvatarClick}
            disabled={uploadingAvatar}
            aria-label="העלאת תמונת פרופיל"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="user-avatar-img" />
            ) : (
              <span className="user-avatar">{initials}</span>
            )}
            <span className="user-avatar-hint">
              {uploadingAvatar ? 'מעלה…' : 'שנה'}
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="visually-hidden"
            onChange={handleAvatarChange}
          />

          <div className="user-info">
            {isEditingName ? (
              <div className="name-edit-row">
                <input
                  className="name-edit-input"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={80}
                  autoFocus
                  aria-label="שם תצוגה"
                />
                <button
                  type="button"
                  className="name-edit-save"
                  onClick={handleSaveName}
                  disabled={savingName}
                >
                  {savingName ? '…' : 'שמור'}
                </button>
                <button
                  type="button"
                  className="name-edit-cancel"
                  onClick={() => setIsEditingName(false)}
                  disabled={savingName}
                >
                  ביטול
                </button>
              </div>
            ) : (
              <div className="name-display-row">
                <h2 className="user-name">{fullName}</h2>
                <button
                  type="button"
                  className="name-edit-trigger"
                  onClick={handleStartEditName}
                  aria-label="עריכת שם תצוגה"
                >
                  <IconEdit size={16} />
                </button>
              </div>
            )}
            <p className="user-email">{user?.email || ''}</p>
            <Badge className="user-role-badge-slot">
              {userRole === 'admin' ? 'מנהל דירה' : 'שותף/ה'}
            </Badge>
          </div>
        </div>
      </section>

      {/* 2. Personal balance */}
      {apartmentId && (
        <section className="profile-card balance-summary-card">
          <div className="balance-summary-top">
            <h2 className="card-title">המאזן האישי שלי</h2>
            <button
              type="button"
              className="balance-dashboard-link"
              onClick={() => navigate('/dashboard')}
            >
              לדשבורד
            </button>
          </div>
          <p className="balance-summary-amount" style={{ color: balanceColor }}>
            {Math.abs(Number(balance)) < EPS
              ? '₪0.00'
              : `${balance > 0 ? '+' : '-'}₪${Math.abs(Number(balance)).toFixed(2)}`}
          </p>
          <p className="balance-summary-subtitle">{balanceSubtitle}</p>
        </section>
      )}

      {/* 3. Apartment details */}
      {apartmentId && (
        <section className="profile-card apartment-card">
          <div className="card-header-row">
            <h2 className="card-title">פרטי הדירה</h2>
            {userRole === 'admin' && (
              <button
                type="button"
                className="edit-apartment-btn"
                onClick={handleOpenEdit}
              >
                עריכה
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

          <div className="info-row no-border invite-row">
            <span className="info-label">קוד הזמנה</span>
            <div className="invite-actions">
              <Badge variant="code">
                {apartmentData?.invite_code || 'לא מוגדר'}
              </Badge>
              <button
                type="button"
                className="invite-action-btn"
                onClick={handleCopyInviteCode}
              >
                העתק
              </button>
              {userRole === 'admin' && (
                <button
                  type="button"
                  className="invite-action-btn"
                  onClick={openRegenerateModal}
                >
                  חדש
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 4. Roommates */}
      {apartmentId && (
        <section className="profile-card roommates-card">
          <h3 className="card-section-header">חברי הדירה</h3>
          {members.length === 0 ? (
            <p className="roommates-empty">אין חברים להצגה</p>
          ) : (
            members.map((member, idx) => {
              const isSelf = member.user_id === user?.id;
              const isAdminMember = member.role === 'admin';
              return (
                <div
                  key={member.user_id}
                  className={`roommate-row ${idx === members.length - 1 ? 'no-border' : ''}`}
                >
                  <div className="roommate-left">
                    <div
                      className={`roommate-avatar ${isAdminMember ? 'bg-dark' : 'bg-lime'}`}
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
                    <div className="roommate-text">
                      <span className="roommate-name">
                        {roommateDisplayName(member)}
                      </span>
                      {isSelf && <span className="self-badge">את/ה</span>}
                    </div>
                  </div>
                  <div className="roommate-right">
                    <Badge>
                      {isAdminMember ? 'מנהל' : 'שותף/ה'}
                    </Badge>
                    {userRole === 'admin' && !isSelf && (
                      <div
                        className="roommate-menu"
                        data-member-menu={member.user_id}
                      >
                        <button
                          type="button"
                          className="roommate-menu-trigger"
                          aria-label={`פעולות עבור ${roommateDisplayName(member)}`}
                          aria-haspopup="menu"
                          aria-expanded={memberMenuId === member.user_id}
                          onClick={() =>
                            setMemberMenuId((prev) =>
                              prev === member.user_id ? null : member.user_id
                            )
                          }
                        >
                          <IconDotsVertical size={18} />
                        </button>
                        {memberMenuId === member.user_id && (
                          <div className="roommate-menu-dropdown" role="menu">
                            {!isAdminMember && (
                              <button
                                type="button"
                                className="roommate-menu-item"
                                role="menuitem"
                                onClick={() => openTransferModal(member)}
                              >
                                הפוך למנהל
                              </button>
                            )}
                            <button
                              type="button"
                              className="roommate-menu-item roommate-menu-item-danger"
                              role="menuitem"
                              onClick={() => openRemoveModal(member)}
                            >
                              הסר מהדירה
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}

      {/* 5. Actions */}
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
          {apartmentId && (
            <button
              type="button"
              className="action-btn leave-apartment-btn"
              onClick={openLeaveModal}
            >
              עזוב דירה
            </button>
          )}
          <button
            type="button"
            className="action-btn logout-btn"
            onClick={handleLogout}
          >
            התנתקות
          </button>
        </div>
      </section>

      {/* Edit apartment modal */}
      {isEditingApartment && (
        <div
          className="modal-overlay"
          onClick={() => setIsEditingApartment(false)}
          role="presentation"
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-apt-title"
          >
            <h2 id="edit-apt-title" className="modal-title">
              עריכת פרטי דירה
            </h2>

            <div className="modal-field">
              <label htmlFor="edit-apt-name">שם הדירה</label>
              <input
                id="edit-apt-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label htmlFor="edit-apt-city">עיר</label>
              <input
                id="edit-apt-city"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label htmlFor="edit-apt-street">רחוב</label>
              <input
                id="edit-apt-street"
                value={editStreet}
                onChange={(e) => setEditStreet(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label htmlFor="edit-apt-building">מספר בניין</label>
              <input
                id="edit-apt-building"
                value={editBuilding}
                onChange={(e) => setEditBuilding(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label htmlFor="edit-apt-num">מספר דירה</label>
              <input
                id="edit-apt-num"
                value={editApartmentNum}
                onChange={(e) => setEditApartmentNum(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-save-btn"
                onClick={handleSaveApartment}
              >
                שמור שינויים
              </button>
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setIsEditingApartment(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div
          className="modal-overlay"
          onClick={() => !actionBusy && setConfirmModal(null)}
          role="presentation"
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <h2 id="confirm-modal-title" className="modal-title">
              {confirmModal.title}
            </h2>
            <p className="modal-body-text">{confirmModal.body}</p>
            <div className="modal-actions">
              <button
                type="button"
                className={
                  confirmModal.danger
                    ? 'modal-danger-btn'
                    : 'modal-save-btn'
                }
                onClick={handleConfirmModal}
                disabled={actionBusy}
              >
                {actionBusy ? 'מבצע…' : confirmModal.confirmLabel}
              </button>
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setConfirmModal(null)}
                disabled={actionBusy}
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
