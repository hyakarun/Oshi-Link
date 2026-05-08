import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { User, Group } from '@/lib/types';
import { Bell, Mail, Smartphone, Info } from 'lucide-react';

type ProfileModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  followedGroups: Group[];
  handleProfileUpdate: (e: React.FormEvent<HTMLFormElement>) => void;
  handleLogout: () => void;
  loading: boolean;
};

export function ProfileModal({
  isOpen,
  onOpenChange,
  user,
  followedGroups,
  handleProfileUpdate,
  handleLogout,
  loading
}: ProfileModalProps) {
  const [selectedTiming, setSelectedTiming] = React.useState<string>('10m');

  React.useEffect(() => {
    if (user?.notification_timing) {
      setSelectedTiming(user.notification_timing);
    }
  }, [user]);

  if (!user) return null;

  const isPro = user.premium_status === 'pro';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white bottom-0 sm:bottom-auto top-auto sm:top-1/2 translate-y-0 sm:-translate-y-1/2 transition-all duration-500">
        <div className="p-8 space-y-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#ff385c] to-[#e00b41] rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
              {user.name[0]}
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-[#222222]">{user.name}</DialogTitle>
              <p className="text-sm text-gray-400">{user.email}</p>
              <div className="mt-1">
                {isPro ? (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-purple-100">Pro Plan</span>
                ) : user.premium_status === 'onetime' ? (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-blue-100">Ad-Free</span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest rounded-full">Free Plan</span>
                )}
              </div>
            </div>
          </div>
          
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* 基本設定 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">表示名</label>
                <input name="name" type="text" defaultValue={user.name} className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" required />
              </div>
            </div>

            {/* 通知設定セクション */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-[#ff385c]" />
                <h3 className="text-sm font-black text-[#222222] uppercase tracking-wider">通知設定</h3>
              </div>

              <div className="space-y-3">
                {/* メール通知 */}
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Mail className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#222222]">メール通知</p>
                      <p className="text-[10px] text-gray-400 font-medium">イベントのリマインドを受信</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    name="email_enabled" 
                    defaultChecked={user.email_enabled} 
                    className="w-5 h-5 accent-[#ff385c] rounded-md"
                  />
                </label>

                {/* プッシュ通知は内部機能として残すがUIからは削除 */}
              </div>

              {/* 通知タイミング */}
              <div className="space-y-3">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] flex items-center justify-between">
                  通知タイミング
                  {!isPro && (
                    <span className="text-[9px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full lowercase tracking-normal">Proで詳細設定が可能</span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: '10m', label: '10分前' },
                    { value: '1h', label: '1時間前' },
                    { value: '1d', label: '前日' },
                    { value: '1w', label: '1週間前' }
                  ].map((option) => (
                    <label 
                      key={option.value}
                      className={`
                        relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer
                        ${selectedTiming === option.value
                          ? 'border-[#ff385c] bg-red-50 text-[#ff385c]' 
                          : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}
                        ${(!isPro && option.value !== '10m') ? 'opacity-70 grayscale' : ''}
                      `}
                      onClick={() => {
                        if (isPro || option.value === '10m') {
                          setSelectedTiming(option.value);
                        }
                      }}
                    >
                      {!isPro && option.value !== '10m' && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-purple-600 text-white text-[7px] font-black rounded-full shadow-sm z-10">PRO</span>
                      )}
                      <input 
                        type="radio" 
                        name="notification_timing" 
                        value={option.value} 
                        className="sr-only"
                        disabled={!isPro && option.value !== '10m'}
                        checked={selectedTiming === option.value}
                        onChange={() => {}} 
                      />
                      <span className="text-xs font-black">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-12 bg-[#222222] hover:bg-black text-white font-black rounded-xl transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? '保存中...' : '設定を保存'}
            </button>
          </form>

          <button
            onClick={handleLogout}
            className="w-full py-3 text-sm font-bold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            ログアウト
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
