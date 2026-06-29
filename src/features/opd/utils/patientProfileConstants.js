import {
  User,
  Calendar,
  Receipt,
  BedDouble,
  Stethoscope,
} from 'lucide-react';

export const PATIENT_PROFILE_TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'visits', label: 'Visits', icon: Calendar },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'admission', label: 'Admission', icon: BedDouble },
  { id: 'medical', label: 'Medical', icon: Stethoscope },
];
