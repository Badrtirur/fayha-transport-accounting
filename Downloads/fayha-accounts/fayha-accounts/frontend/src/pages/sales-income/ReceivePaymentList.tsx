import React from 'react';
import PaymentEntryList from '../payment-entry/PaymentEntryList';

const ReceivePaymentList: React.FC = () => {
  return <PaymentEntryList filterType="Receipt" />;
};

export default ReceivePaymentList;
