import React from 'react';
import Badge from '../Badge/Badge';
import { IconDotsVertical } from '../icons/TablerIcons';

export default function MembersManagement({
  members,
  userRole,
  currentUserId,
  memberMenuId,
  roommateDisplayName,
  roommateInitials,
  onToggleMemberMenu,
  onTransferAdmin,
  onRemoveMember,
}) {
  return (
    <section className="profile-card roommates-card">
      <h3 className="card-section-header">חברי הדירה</h3>
      {members.length === 0 ? (
        <p className="roommates-empty">אין חברים להצגה</p>
      ) : (
        members.map((member, idx) => {
          const isSelf = member.user_id === currentUserId;
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
                <Badge>{isAdminMember ? 'מנהל' : 'שותף/ה'}</Badge>
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
                      onClick={() => onToggleMemberMenu(member.user_id)}
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
                            onClick={() => onTransferAdmin(member)}
                          >
                            הפוך למנהל
                          </button>
                        )}
                        <button
                          type="button"
                          className="roommate-menu-item roommate-menu-item-danger"
                          role="menuitem"
                          onClick={() => onRemoveMember(member)}
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
  );
}
