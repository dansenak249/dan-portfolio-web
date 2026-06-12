import FoodPicker from './FoodPicker'

export const metadata = {
  title: 'Hôm nay ăn gì?',
  description:
    'Random một món ăn Việt Nam hoặc quốc tế khi không biết hôm nay ăn gì.',
  robots: { index: false, follow: false },
}

export default function HomNayAnGiPage() {
  return <FoodPicker />
}
