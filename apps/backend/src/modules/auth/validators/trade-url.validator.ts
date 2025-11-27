import { registerDecorator, ValidationOptions } from 'class-validator';

export function isValidSteamTradeUrl(tradeUrl: string): boolean {
  if (!tradeUrl || typeof tradeUrl !== 'string') {
    return false;
  }

  try {
    const url = new URL(tradeUrl);

    // Check if it's a Steam trade URL
    if (url.origin !== 'https://steamcommunity.com') {
      return false;
    }

    // Check if it's a trade offer URL
    if (!url.pathname.startsWith('/tradeoffer/new/')) {
      return false;
    }

    // Check for required parameters
    const partner = url.searchParams.get('partner');
    const token = url.searchParams.get('token');

    return !!(partner && token && /^\d+$/.test(partner) && /^[a-zA-Z0-9_-]+$/.test(token));
  } catch {
    return false;
  }
}

export function IsValidTradeUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidSteamTradeUrl',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          return isValidSteamTradeUrl(value);
        },
        defaultMessage() {
          return 'Invalid Steam trade URL format. Expected format: https://steamcommunity.com/tradeoffer/new/?partner=XXXXXXXXX&token=XXXXXXXX';
        },
      },
    });
  };
}