export default function AllergyBanner({ allergies, className }) {
  if (!allergies) return null;
  return (
    <div className={className || 'pharmacy-allergy-banner'} role="alert">
      Allergy alert: {allergies}
    </div>
  );
}
