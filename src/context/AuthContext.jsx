import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState('');

  const clearApartmentState = () => {
    setApartmentId(null);
    setHasApartment(false);
    setApartmentName('');
    setApartmentAddress('');
    setApartmentInviteCode('');
    setApartmentCity('');
    setUserRole('');
  };

  const clearProfileState = () => {
    setAvatarUrl('');
    setDisplayName('');
  };

  const loadProfile = useCallback(async (userId, authUser) => {
    if (!userId) {
      clearProfileState();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      const name =
        data?.full_name?.trim() ||
        authUser?.user_metadata?.full_name ||
        'משתמש';
      setDisplayName(name);
      setAvatarUrl(data?.avatar_url || '');
    } catch (err) {
      console.error('loadProfile error:', err);
      setDisplayName(authUser?.user_metadata?.full_name || 'משתמש');
      setAvatarUrl('');
    }
  }, []);

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
          [
            `${row.street || ''} ${row.building_number || ''}`.trim(),
            row.apartment_number ? `דירה ${row.apartment_number}` : '',
            row.city || '',
          ]
            .filter(Boolean)
            .join(', ')
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
            [
              `${apartmentData.street || ''} ${apartmentData.building_number || ''}`.trim(),
              apartmentData.apartment_number
                ? `דירה ${apartmentData.apartment_number}`
                : '',
              apartmentData.city || '',
            ]
              .filter(Boolean)
              .join(', ')
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
        await Promise.all([
          checkApartment(session.user.id),
          loadProfile(session.user.id, session.user),
        ]);
      } else {
        clearApartmentState();
        clearProfileState();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoggedIn(!!session?.user);
        if (session?.user) {
          await Promise.all([
            checkApartment(session.user.id),
            loadProfile(session.user.id, session.user),
          ]);
        } else {
          clearApartmentState();
          clearProfileState();
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        loading,
        apartmentId,
        hasApartment,
        apartmentName,
        apartmentAddress,
        apartmentInviteCode,
        apartmentCity,
        userRole,
        avatarUrl,
        displayName,
        setAvatarUrl,
        setDisplayName,
        login,
        register,
        logout,
        refreshApartment: async (userId) => {
          const id = userId || user?.id;
          if (!id) return false;
          return checkApartment(id);
        },
        refreshProfile: async (userId) => {
          const id = userId || user?.id;
          if (!id) return;
          return loadProfile(id, user);
        },
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
