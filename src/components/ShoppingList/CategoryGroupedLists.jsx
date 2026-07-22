import React, { useMemo } from 'react';
import { groupItemsByCategory } from '../../lib/shopping';
import SortableList from './SortableList';

export default function CategoryGroupedLists({
  items,
  isDone,
  userId,
  categoryOrder,
  onToggle,
  onEdit,
  onLiveGroupReorder,
  onPersistGroup,
}) {
  const groups = useMemo(
    () => groupItemsByCategory(items, categoryOrder),
    [items, categoryOrder]
  );

  return (
    <div className="category-groups">
      {groups.map((group) => (
        <div key={group.category} className="category-group">
          <h3 className="category-heading">{group.label}</h3>
          <SortableList
            items={group.items}
            isDone={isDone}
            userId={userId}
            onToggle={onToggle}
            onEdit={onEdit}
            onLiveReorder={(nextGroup) =>
              onLiveGroupReorder(group.category, nextGroup)
            }
            onPersist={(nextGroup) => onPersistGroup(group.category, nextGroup)}
          />
        </div>
      ))}
    </div>
  );
}
