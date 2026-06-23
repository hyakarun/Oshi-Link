import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface NoticeDialogsProps {
  officialApplicationNotice: boolean;
  setOfficialApplicationNotice: (open: boolean) => void;
  officialCalendarName?: string;
  disputeWarning: boolean;
  setDisputeWarning: (open: boolean) => void;
}

/** 公式カレンダー申請受付・不正確判定警告の通知ダイアログ群 */
export function NoticeDialogs({
  officialApplicationNotice,
  setOfficialApplicationNotice,
  officialCalendarName,
  disputeWarning,
  setDisputeWarning,
}: NoticeDialogsProps) {
  return (
    <>
      <Dialog open={officialApplicationNotice} onOpenChange={setOfficialApplicationNotice}>
        <DialogContent className="max-w-md p-8 rounded-[32px] border-none shadow-2xl top-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-amber-600" />
            </div>
            <DialogTitle className="text-xl font-black text-[#222222]">公式カレンダー申請を受け付けました</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 font-medium leading-relaxed">
              「{officialCalendarName}」の審査を開始しました。<br /><br />
              承認されるまでカレンダーは作成されません。結果はプロフィール画面でも確認できます。
            </DialogDescription>
            <Button
              onClick={() => setOfficialApplicationNotice(false)}
              className="w-full bg-[#222222] hover:bg-black text-white h-12 rounded-xl font-black transition-all"
            >
              了解しました
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeWarning} onOpenChange={setDisputeWarning}>
        <DialogContent className="max-w-md p-8 rounded-[32px] border-none shadow-2xl top-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-[#6366f1]" />
            </div>
            <DialogTitle className="text-xl font-black text-[#222222]">投稿に関するご注意</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 font-medium leading-relaxed">
              あなたが作成した予定が、コミュニティにより「不正確」であると判断されました。<br /><br />
              虚偽情報の投稿が繰り返されると、新しい予定の作成ができなくなる場合がありますのでご注意ください。
            </DialogDescription>
            <Button
              onClick={() => setDisputeWarning(false)}
              className="w-full bg-[#222222] hover:bg-black text-white h-12 rounded-xl font-black transition-all"
            >
              了解しました
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
