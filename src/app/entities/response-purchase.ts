export interface ResponsePurchase {
  orderTrackingNumber?: string;
  orderSummaryHtml?: string;
  paymentUrl?: string;
  waitingForPayment?: boolean;
  ok?: boolean;
}
