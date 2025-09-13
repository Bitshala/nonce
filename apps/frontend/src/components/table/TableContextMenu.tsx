import React, { useEffect, useRef } from 'react';

interface TableContextMenuProps {
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    targetId: number | null;
  };
  onClose: () => void;
  onDelete: (studentId: number) => void;
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
      onDelete(contextMenu.targetId);
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
      }}
      className="bg-white border border-zinc-300 rounded-md shadow-lg py-1 w-40"
    >
      <ul>
        <li>
          <button
            onClick={handleDelete}
            className="cursor-pointer w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-red-500 hover:text-white transition-colors"
          >
            Delete Row
          </button>
        </li>
      </ul>
    </div>
  );
};