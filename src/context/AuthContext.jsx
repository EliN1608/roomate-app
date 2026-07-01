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

  const checkApartment = async (userId) => {
    try {
      const { data: memberData } = await supabase
        .from('members')
        .select('apartment_id')
        .eq('user_id', userId)
        .single();
      
      if (memberData) {
        setApartmentId(memberData.apartment_id);
        setHasApartment(true);

        const { data: apartmentData } = await supabase
          .from('apartments')
          .select('name')
          .eq('id', memberData.apartment_id)
          .single();
        
        if (apartmentData) {
          setApartmentName(apartmentData.name);
        }
      } else {
        setApartmentId(null);
        setHasApartment(false);
        setApartmentName('');
      }
    } catch (err) {
      setApartmentId(null);
      setHasApartment(false);
      setApartmentName('');
    }
  };

  useEffect(() => {
    // Check existing session on mount
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

    // Listen for auth changes
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
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    if (error) throw error;
  };

  const register = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoggedIn, 
      loading,
      apartmentId,
      hasApartment,
      apartmentName,
      login, 
      register,
      logout 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
