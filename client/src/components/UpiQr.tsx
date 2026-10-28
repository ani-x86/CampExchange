import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildUpiUri, UpiUriParams } from '@/lib/upi';
import clsx from 'clsx';

export interface UpiQrProps extends UpiUriParams {
  size?: number;
  className?: string;
}

export const UpiQr: React.FC<UpiQrProps> = ({
  pa,
  pn,
  am,
  tn = 'CampExchange',
  size = 220,
  className,
}) => {
  const uri = buildUpiUri({ pa, pn, am, tn });

  return (
    <div
      className={clsx(
        'inline-flex flex-col items-center justify-center p-3.5 bg-white border border-line rounded-sm',
        className
      )}
    >
      <QRCodeSVG
        value={uri}
        size={size}
        level="M"
        bgColor="#FFFFFF"
        fgColor="#111111"
        includeMargin={true}
      />
    </div>
  );
};
