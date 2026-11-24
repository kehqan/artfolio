import { AvailableNearYou } from "../AvailableNearYou";

export default function AvailableInCityPage({ params }: { params: { city: string } }) {
  return <AvailableNearYou slug={decodeURIComponent(params.city).toLowerCase()} />;
}
