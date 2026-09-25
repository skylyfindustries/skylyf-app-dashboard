import { Pencil, Trash2 } from 'lucide-react';

// Row action buttons. Clicks don't bubble, so they work inside clickable rows.
export const Actions = ({ children }) => <div className="actions" onClick={(e) => e.stopPropagation()}>{children}</div>;

export const IconBtn = ({ icon: Icon, title, onClick, danger }) => (
  <button type="button" className={`icon ${danger ? 'danger' : ''}`} title={title} aria-label={title} onClick={onClick}><Icon size={16} /></button>
);

export const EditDelete = ({ onEdit, onDelete }) => (
  <Actions>
    <IconBtn icon={Pencil} title="Edit" onClick={onEdit} />
    <IconBtn icon={Trash2} title="Delete" onClick={onDelete} danger />
  </Actions>
);
