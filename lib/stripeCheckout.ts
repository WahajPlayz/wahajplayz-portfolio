const paymentDisabledMessage = 'Store checkout has been disabled in this build.';

export const startStoreCheckout = async () => {
  throw new Error(paymentDisabledMessage);
};

export const verifyDigitalCheckout = async () => {
  throw new Error(paymentDisabledMessage);
};

export const fetchDigitalDownloadUrl = async () => {
  throw new Error(paymentDisabledMessage);
};

export const fetchOrderSummary = async () => {
  throw new Error(paymentDisabledMessage);
};
