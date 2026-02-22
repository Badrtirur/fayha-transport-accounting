import toast from 'react-hot-toast';

export const showSuccess = (message: string) => toast.success(message, {
  style: { borderRadius: '12px', background: '#10b981', color: '#fff', fontWeight: 600 },
  iconTheme: { primary: '#fff', secondary: '#10b981' },
});

export const showError = (message: string) => toast.error(message, {
  style: { borderRadius: '12px', background: '#ef4444', color: '#fff', fontWeight: 600 },
  iconTheme: { primary: '#fff', secondary: '#ef4444' },
});

export const showInfo = (message: string) => toast(message, {
  style: { borderRadius: '12px', background: '#3b82f6', color: '#fff', fontWeight: 600 },
  icon: '\u2139\uFE0F',
});
