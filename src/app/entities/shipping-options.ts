export interface ShippingOption {
  id: string,
  name: string,
  cost: number,
  description: string,
  descriptionRo: string,
  expectedDeliveryFrom: number,
  expectedDeliveryTo: number,
  freeShippingFrom: number,
  cashOnDeliveryAvailable: boolean,
  cardOnDeliveryAvailable: boolean,
  onlinePaymentAvailable: boolean,
  expectedDeliveryDescription: string,

}
