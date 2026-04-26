import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { User, Group } from '@/lib/types';

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
  if (!user) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#ff385c] to-[#e00b41] rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
              {user.name[0]}
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-[#222222]">{user.name}</DialogTitle>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">フォロー中のカレンダー</p>
            <p className="text-2xl font-black text-[#222222]">{followedGroups.length} 件</p>
          </div>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">表示名</label>
              <input name="name" type="text" defaultValue={user.name} className="w-full h-12 bg-gray-50 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#ff385c] outline-none font-bold text-[#222222]" required />
            </div>
            <button type="submit" disabled={loading} className="w-full h-12 bg-[#222222] hover:bg-black text-white font-black rounded-xl transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? '保存中...' : '名前を更新'}
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
