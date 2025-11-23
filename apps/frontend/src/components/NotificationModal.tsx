import type { NotificationType } from '../types/feedback';

interface NotificationModalProps {
  show: boolean;
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const NotificationModal = ({ show, message, type, onClose }: NotificationModalProps) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-zinc-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
        <div className="flex flex-col items-center text-center">
          {type === 'success' ? (
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
          <h3 className="text-2xl font-bold text-zinc-100 mb-2">
            {type === 'success' ? 'Success!' : 'Error'}
          </h3>
          <p className="text-zinc-300 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="border-none bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
