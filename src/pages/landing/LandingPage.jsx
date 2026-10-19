import { useEffect } from 'react';
import {
  AboutBand,
  ClosingCta,
  Contact,
  Features,
  Footer,
  Hero,
  Modules,
  Navbar,
  WhyUs,
  Workflow,
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
        <Features />
        <Modules />
        <Workflow />
        <AboutBand />
        <WhyUs />
        <ClosingCta />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
