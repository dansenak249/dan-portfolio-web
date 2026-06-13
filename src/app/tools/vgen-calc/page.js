import VGenCalculator from './VGenCalculator'

export const metadata = {
  title: 'VGen Fee Calculator',
  description:
    'Tính nhanh phí gửi cho team mate sau khi client thanh toán qua VGen (VGen fee + Paypal/Stripe gateway).',
  robots: { index: false, follow: false },
}

export default function VGenCalcPage() {
  return <VGenCalculator />
}
