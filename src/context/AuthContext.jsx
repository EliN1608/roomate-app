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

  const clearApartmentState = () => {
    setApartmentId(null);
    setHasApartment(false);
    setApartmentName('');
    setApartmentAddress('');
    setApartmentInviteCode('');
    setApartmentCity('');
    setUserRole('');
  };

  const checkApartment = async (userId) => {
    try {
      const { data: rpcRows, error: rpcError } = await supabase.rpc('get_my_apartment');

      if (!rpcError && rpcRows?.length) {
        const row = rpcRows[0];
        setApartmentId(row.apartment_id);
        setHasApartment(true);
        setUserRole(row.role || 'member');
        setApartmentName(row.name || '');
        setApartmentInviteCode(row.invite_code || '');
        setApartmentCity(row.city || '');
        setApartmentAddress(
          `${row.street || ''} ${row.building_number || ''}, דירה ${row.apartment_number || ''}`.trim()
        );
        return true;
      }

      // Fallback if RPC not deployed yet
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('apartment_id, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberError) throw memberError;

      if (memberData) {
        setApartmentId(memberData.apartment_id);
        setHasApartment(true);
        setUserRole(memberData.role || 'member');

        const { data: apartmentData, error: aptError } = await supabase
          .from('apartments')
          .select('name, street, building_number, apartment_number, invite_code, city')
          .eq('id', memberData.apartment_id)
          .maybeSingle();

        if (aptError) console.error('Apartment fetch error:', aptError);

        if (apartmentData) {
          setApartmentName(apartmentData.name || '');
          setApartmentInviteCode(apartmentData.invite_code || '');
          setApartmentCity(apartmentData.city || '');
          setApartmentAddress(
            `${apartmentData.street || ''} ${apartmentData.building_number || ''}, דירה ${apartmentData.apartment_number || ''}`.trim()
          );
        }
        return true;
      }

      clearApartmentState();
      return false;
    } catch (err) {
      console.error('checkApartment error:', err);
      clearApartmentState();
      return false;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoggedIn(!!session?.user);
      if (session?.user) {
        await checkApartment(session.user.id);
      } else {
        clearApartmentState();
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
          clearApartmentState();
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
      refreshApartment: async (userId) => {
        const id = userId || user?.id;
        if (!id) return false;
        return checkApartment(id);
      }
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
