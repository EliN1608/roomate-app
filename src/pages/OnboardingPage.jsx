import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './OnboardingPage.css';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'join'
  const [apartmentName, setApartmentName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedInviteCode, setGeneratedInviteCode] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!apartmentName.trim()) {
      alert('נא להזין שם דירה');
      return;
    }
    try {
      setLoading(true);
      
      // 1. Generate invite code
      const generatedCode = Math.random().toString(36)
        .substring(2, 8).toUpperCase();
      
      // 2. Create apartment in Supabase
      const { data: apartment, error: apartmentError } = await supabase
        .from('apartments')
        .insert({
          name: apartmentName,
          invite_code: generatedCode,
          created_by: user.id
        })
        .select()
        .single();
      
      if (apartmentError) throw apartmentError;
      
      // 3. Add user as admin member
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: user.id,
          apartment_id: apartment.id,
          role: 'admin'
        });
      
      if (memberError) throw memberError;
      
      // 4. Set generated invite code state before navigating
      setGeneratedInviteCode(generatedCode);
      
      // 5. Navigate to dashboard
      navigate('/dashboard');
      
    } catch (err) {
      alert('שגיאה ביצירת דירה: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      alert('נא להזין קוד הזמנה');
      return;
    }
    try {
      setLoading(true);
      
      // 1. Find apartment by invite code
      const { data: apartment, error: findError } = await supabase
        .from('apartments')
        .select('id, name')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();
      
      if (findError || !apartment) {
        alert('קוד הזמנה לא נמצא. נסו שנית.');
        return;
      }
      
      // 2. Check if already a member
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .eq('apartment_id', apartment.id)
        .single();
      
      if (existingMember) {
        alert('אתם כבר חברים בדירה זו!');
        navigate('/dashboard');
        return;
      }
      
      // 3. Add user as member
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: user.id,
          apartment_id: apartment.id,
          role: 'member'
        });
      
      if (memberError) throw memberError;
      
      // 4. Navigate to dashboard
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
          <form onSubmit={handleCreate} className="onboarding-tab-form">
            <div className="onboarding-field-group">
              <label className="onboarding-field-label" htmlFor="create-apt-name">שם הדירה</label>
              <input
                id="create-apt-name"
                type="text"
                className="onboarding-field-input"
                placeholder="לדוגמה: דירת הרצל / בית החלומות"
                value={apartmentName}
                onChange={(e) => setApartmentName(e.target.value)}
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
