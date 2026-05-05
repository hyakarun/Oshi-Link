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
              <div className="mt-1">
                {user.premium_status === 'pro' ? (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-purple-100">Pro Plan</span>
                ) : user.premium_status === 'onetime' ? (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-blue-100">Ad-Free</span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest rounded-full">Free Plan</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">フォロー中</p>
              <p className="text-xl font-black text-[#222222]">{followedGroups.length} / {user.premium_status === 'pro' ? 10 : 1} 件</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">通知設定</p>
              <p className="text-sm font-bold text-[#222222]">
                {user.premium_status === 'pro' ? 'カスタム可能' : '直前のみ'}
              </p>
            </div>
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
