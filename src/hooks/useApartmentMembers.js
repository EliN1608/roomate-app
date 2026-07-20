import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Load apartment members with display names.
 * @param {string | null | undefined} apartmentId
 * @param {string | null | undefined} currentUserId
 */
export function useApartmentMembers(apartmentId, currentUserId) {
  const [members, setMembers] = useState([]);
  const [memberIds, setMemberIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!apartmentId) {
      setMembers([]);
      setMemberIds([]);
      setError('');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data: membersData, error: rpcError } = await supabase.rpc(
        'get_apartment_members',
        { apt_id: apartmentId }
      );

      if (rpcError) throw rpcError;

      const rows = membersData || [];
      const ids = rows.map((m) => m.user_id);
      setMemberIds(ids);

      setMembers(
        rows.map((m, idx) => ({
          id: m.user_id,
          name:
            m.user_id === currentUserId
              ? 'אני'
              : m.full_name || `שותף ${idx + 1}`,
        }))
      );
    } catch (err) {
      setMembers([]);
      setMemberIds([]);
      setError(err.message || 'שגיאה בטעינת שותפים');
    } finally {
      setLoading(false);
    }
  }, [apartmentId, currentUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { members, memberIds, loading, error, refresh };
}
