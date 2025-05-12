//ADDS STATE MACHINE
export enum TypeStateMachine {
  //RIA
  REVERSE_PAYMENT_ORDER_RIA = "reverse-payment-order-ria",
  ONLINE_PAYMENT_ORDER_RIA = "online-payment-order-ria",
  CONSULT_ORDER_RIA = "consult-order-ria",

  //INTERMEX
  CONSULT_ORDER_INTERMEX = "consult-order-intermex",
  ONLINE_PAYMENT_ORDER_INTERMEX = "online-payment-order-intermex",
  REVERSE_ORDER_INTERMEX = "reverse-order-intermex",

  //TRANSNETWORK 
  DOWNLOAD_ORDERS_TRANSNETWORK = "download-orders-transnetwork",
  CONFIRM_RECEIVED_ORDER_TRANSNETWORK = "confirm-received-order-transnetwork",
  UPDATE_STATUS_ORDER_TRANSNETWORK = "update-status-order-transnetwork",
  ONLINE_CONSULT_ORDER_TRANSNETWORK = "online-consult-order-transnetwork",
  ONLINE_PAYMENT_ORDER_TRANSNETWORK = "online-payment-order-transnetwork",
  ONLINE_REVERSE_ORDER_TRANSNETWORK = "online-reverse-order-transnetwork",

  
}

export enum TablesDynamoDB {
  TABLE_ONLINE_PAYMENTS= "ms-giros-enlinea-dev-online-payments",
}
export enum TypeCorrespondent {
  RIA = "36",
  INTERMEX = "150",
  TRANSNETWORK= "33"
}