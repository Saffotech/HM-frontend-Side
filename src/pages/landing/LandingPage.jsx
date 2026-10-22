import { useEffect } from 'react';
import {
  Navbar,
  Hero,
  TrustedBy,
  Features,
  DashboardPreview,
  Modules,
  Workflow,
  WhyUs,
  Testimonials,
  Security,
  FAQ,
  Contact,
  Footer,
} from '@/pages/landing/components';
import { useScrollToHash } from '@/pages/landing/useScrollToHash';
import '@/pages/landing/styles/landing-theme.css';
import './LandingPage.css';

export default function LandingPage() {
  useScrollToHash();

  useEffect(() => {
    document.title = 'SaffoCare — Hospital Management System for Smart Healthcare';
  }, []);

  return (
    <div className="landing-page">
      <Navbar />
      <main>
        <Hero />
        <TrustedBy />
        <Features />
        <DashboardPreview />
        <Modules />
        <Workflow />
        <WhyUs />
        <Testimonials />
        <Security />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
