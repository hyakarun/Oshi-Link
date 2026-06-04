import Image from 'next/image';
import { cn } from '@/lib/utils';
import appIcon from '@/app/icon.png';

type OshiLinkLogoProps = {
  size?: number;
  className?: string;
};

/** ファビコン（app/icon.png）と同一ファイル。追加の角丸・クロップはしない */
export function OshiLinkLogo({ size = 36, className }: OshiLinkLogoProps) {
  return (
    <Image
      src={appIcon}
      alt="Oshi-Link"
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      priority
      unoptimized
    />
  );
}
