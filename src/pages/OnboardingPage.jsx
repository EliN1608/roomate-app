import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { rpcFindApartmentByInvite } from '../lib/apartmentApi';
import { supabase } from '../lib/supabase';
import './OnboardingPage.css';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshApartment } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'join'
  const [apartmentName, setApartmentName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedInviteCode, setGeneratedInviteCode] = useState('');
  const [street, setStreet] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [apartmentCreated, setApartmentCreated] = useState(false);
  const [city, setCity] = useState('');

  const goToDashboard = async () => {
    await refreshApartment(user?.id);
    navigate('/dashboard');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      alert('יש להתחבר לפני יצירת דירה');
      navigate('/login');
      return;
    }
    if (!apartmentName.trim()) {
      alert('נא להזין שם דירה');
      return;
    }
    try {
      setLoading(true);
      
      // 1. Generate invite code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const generatedCode = Array.from(
        { length: 6 }, 
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join('');
      
      // 2. Create apartment in Supabase
      const { data: apartment, error: apartmentError } = await supabase
        .from('apartments')
        .insert({
          name: apartmentName,
          invite_code: generatedCode,
          created_by: user.id,
          street: street,
          building_number: buildingNumber,
          apartment_number: apartmentNumber,
          city: city
        })
        .select()
        .maybeSingle();
      
      if (apartmentError) throw apartmentError;
      if (!apartment?.id) throw new Error('לא התקבל מזהה דירה');
      
      // 3. Add user as admin member
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: user.id,
          apartment_id: apartment.id,
          role: 'admin'
        });
      
      if (memberError) throw memberError;

      await refreshApartment(user.id);
      
      // 4. Set generated invite code state before navigating
      setGeneratedInviteCode(generatedCode);
      setCreatedInviteCode(generatedCode);
      setApartmentCreated(true);
      
    } catch (err) {
      alert('שגיאה ביצירת דירה: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      alert('יש להתחבר לפני הצטרפות לדירה');
      navigate('/login');
      return;
    }
    if (!inviteCode.trim()) {
      alert('נא להזין קוד הזמנה');
      return;
    }
    try {
      setLoading(true);
      
      // 1. Find apartment by invite code (server-side lookup)
      const apartment = await rpcFindApartmentByInvite(supabase, inviteCode);
      
      if (!apartment) {
        alert('קוד הזמנה לא נמצא. נסו שנית.');
        return;
      }

      // Block joining a second apartment (AuthContext uses maybeSingle)
      const { data: anyMembership } = await supabase
        .from('members')
        .select('id, apartment_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (anyMembership) {
        if (anyMembership.apartment_id === apartment.id) {
          alert('אתם כבר חברים בדירה זו!');
        } else {
          alert('אתם כבר חברים בדירה אחרת. עזבו אותה לפני הצטרפות לדירה חדשה.');
        }
        await refreshApartment(user.id);
        navigate('/dashboard');
        return;
      }
      
      // 2. Add user as member
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: user.id,
          apartment_id: apartment.id,
          role: 'member'
        });
      
      if (memberError) throw memberError;
      
      await refreshApartment(user.id);
      navigate('/dashboard');
      
    } catch (err) {
      alert('שגיאה בהצטרפות לדירה: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page-container" id="onboarding-page">
      {/* 1. Top Logo */}
      <header className="onboarding-header">
        <span className="onboarding-logo">RooMate</span>
      </header>

      {/* 2. Titles */}
      <div className="onboarding-titles-section">
        <h1 className="onboarding-page-title">בואו נתחיל</h1>
        <p className="onboarding-page-subtitle">כל מגורים משותפים מוצלחים מתחילים בכלל אחד משותף</p>
      </div>

      {/* 3. Main Black Card */}
      <div className="onboarding-black-card">
        {/* Tab Switcher */}
        <div className="onboarding-tab-switcher">
          <button
            type="button"
            className={`onboarding-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            יצירת דירה
          </button>
          <button
            type="button"
            className={`onboarding-tab-btn ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            הצטרפות לדירה
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'create' ? (
          apartmentCreated ? (
            <div className="invite-code-success">
              <div className="success-title">הדירה נוצרה! 🎉</div>
              <div className="success-subtitle">קוד ההזמנה לדירה שלך:</div>
              <div className="invite-code-display">{createdInviteCode}</div>
              <div className="success-hint">שתפו את הקוד עם השותפים שלכם</div>
              <button 
                type="button" 
                className="onboarding-submit-btn"
                onClick={goToDashboard}
              >
                כניסה לדירה
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="onboarding-tab-form">
              <div className="onboarding-field-group">
                <label className="onboarding-field-label" htmlFor="create-apt-name">שם הדירה</label>
                <input
                  id="create-apt-name"
                  type="text"
                  className="onboarding-field-input"
                  placeholder="לדוגמה: דירת הרצל"
                  value={apartmentName}
                  onChange={(e) => setApartmentName(e.target.value)}
                />
              </div>

              <div className="onboarding-field-group">
                <label className="onboarding-field-label" 
                  htmlFor="create-city">עיר</label>
                <input
                  id="create-city"
                  type="text"
                  className="onboarding-field-input"
                  placeholder="לדוגמה: תל אביב, ירושלים, חיפה"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="onboarding-field-group">
                <label className="onboarding-field-label" htmlFor="create-street">רחוב</label>
                <input
                  id="create-street"
                  type="text"
                  className="onboarding-field-input"
                  placeholder="לדוגמה: הרצל"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>

              <div className="onboarding-field-group">
                <label className="onboarding-field-label" htmlFor="create-building-number">מספר בניין</label>
                <input
                  id="create-building-number"
                  type="text"
                  className="onboarding-field-input"
                  placeholder="לדוגמה: 12"
                  value={buildingNumber}
                  onChange={(e) => setBuildingNumber(e.target.value)}
                />
              </div>

              <div className="onboarding-field-group">
                <label className="onboarding-field-label" htmlFor="create-apartment-number">מספר דירה</label>
                <input
                  id="create-apartment-number"
                  type="text"
                  className="onboarding-field-input"
                  placeholder="לדוגמה: 4"
                  value={apartmentNumber}
                  onChange={(e) => setApartmentNumber(e.target.value)}
                />
              </div>

              <button type="submit" className="onboarding-submit-btn" disabled={loading}>
                {loading ? 'טוען...' : 'צור דירה חדשה'}
              </button>

              {/* Nested Dark Card */}
              <div className="nested-onboarding-card">
                <div className="nested-card-label">לאחר היצירה תקבלו קוד הזמנה</div>
                <div className="nested-card-code">{generatedInviteCode || 'XXXXXX'}</div>
                <div className="nested-card-subtext">שתפו את הקוד עם השותפים שלכם</div>
              </div>
            </form>
          )
        ) : (
          <form onSubmit={handleJoin} className="onboarding-tab-form">
            <div className="onboarding-field-group">
              <label className="onboarding-field-label" htmlFor="join-invite-code">קוד הזמנה</label>
              <input
                id="join-invite-code"
                type="text"
                className="onboarding-field-input code-mono-field"
                placeholder="הזינו את קוד ההזמנה"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </div>

            <button type="submit" className="onboarding-submit-btn" disabled={loading}>
              {loading ? 'טוען...' : 'הצטרפו לדירה'}
            </button>
          </form>
        )}
      </div>

      {/* 4. Footer Link */}
      {activeTab === 'create' ? (
        <p className="onboarding-footer-text-link">
          כבר יש לכם קוד הזמנה? <button type="button" className="onboarding-link-action" onClick={() => setActiveTab('join')}>לחצו כאן</button>
        </p>
      ) : (
        <p className="onboarding-footer-text-link">
          רוצים ליצור דירה חדשה? <button type="button" className="onboarding-link-action" onClick={() => setActiveTab('create')}>לחצו כאן</button>
        </p>
      )}
    </div>
  );
}
