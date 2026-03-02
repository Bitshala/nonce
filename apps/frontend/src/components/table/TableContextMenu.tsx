import React, { useEffect, useRef } from 'react';

interface TableContextMenuProps {
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    targetId: number | null;
  };
  onClose: () => void;
  onDelete: (studentId: string) => void;
}

export const TableContextMenu: React.FC<TableContextMenuProps> = ({
  contextMenu,
  onClose,
  onDelete,
}) => {
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenu.visible &&
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && contextMenu.visible) {
        onClose();
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [contextMenu.visible, onClose]);

  const handleDelete = () => {
    if (contextMenu.targetId !== null) {
      onDelete(String(contextMenu.targetId));
      onClose();
    }
  };

  if (!contextMenu.visible) {
    return null;
  }

  return (
    <div
      ref={contextMenuRef}
      style={{
        top: contextMenu.y,
        left: contextMenu.x,
        position: 'fixed',
        zIndex: 1000,
        backgroundColor: '#1c1c1e',
        border: '1px solid #3f3f46',
        borderRadius: '8px',
        width: '176px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        padding: '4px 0',
      }}
    >
      <div
        onClick={handleDelete}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#d4d4d8'; }}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          color: '#d4d4d8',
          backgroundColor: 'transparent',
          cursor: 'pointer',
        }}
      >
        Delete Row
      </div>
    </div>
  );
};
