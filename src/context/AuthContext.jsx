import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apartmentId, setApartmentId] = useState(null);
  const [hasApartment, setHasApartment] = useState(false);
  const [apartmentName, setApartmentName] = useState('');
  const [apartmentAddress, setApartmentAddress] = useState('');
  const [apartmentInviteCode, setApartmentInviteCode] = useState('');
  const [apartmentCity, setApartmentCity] = useState('');
  const [userRole, setUserRole] = useState('');

  const checkApartment = async (userId) => {
    try {
      const { data: memberData } = await supabase
        .from('members')
        .select('apartment_id, role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (memberData) {
        setApartmentId(memberData.apartment_id);
        setHasApartment(true);
        setUserRole(memberData.role || 'member');

        const { data: apartmentData } = await supabase
          .from('apartments')
          .select('name, street, building_number, apartment_number, invite_code, city')
          .eq('id', memberData.apartment_id)
          .single();
        
        if (apartmentData) {
          setApartmentName(apartmentData.name);
          setApartmentInviteCode(apartmentData.invite_code);
          setApartmentCity(apartmentData.city || '');
          setApartmentAddress(
            `${apartmentData.street || ''} ${apartmentData.building_number || ''}, דירה ${apartmentData.apartment_number || ''}`
          );
        }
      } else {
        setApartmentId(null);
        setHasApartment(false);
        setApartmentName('');
        setApartmentAddress('');
        setApartmentInviteCode('');
        setApartmentCity('');
        setUserRole('');
      }
    } catch (err) {
      setApartmentId(null);
      setHasApartment(false);
      setApartmentName('');
      setApartmentAddress('');
      setApartmentInviteCode('');
      setApartmentCity('');
      setUserRole('');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoggedIn(!!session?.user);
      if (session?.user) {
        await checkApartment(session.user.id);
      } else {
        setApartmentId(null);
        setHasApartment(false);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoggedIn(!!session?.user);
        if (session?.user) {
          await checkApartment(session.user.id);
        } else {
          setApartmentId(null);
          setHasApartment(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({ 
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, isLoggedIn, loading,
      apartmentId, hasApartment,
      apartmentName, apartmentAddress, 
      apartmentInviteCode, apartmentCity, userRole,
      login, register, logout,
      refreshApartment: () => user ? checkApartment(user.id) : null
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
