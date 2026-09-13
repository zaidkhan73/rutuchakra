import Header from '../components/landing/Header'
import Hero from '../components/landing/Hero'
import Awareness from '../components/landing/Awareness'
import HowItWorks from '../components/landing/HowItWorks'
import ExplainableAIPreview from '../components/landing/ExplainableAIPreview'
import TrackingPreview from '../components/landing/TrackingPreview'
import AIAssistantPreview from '../components/landing/AIAssistantPreview'
import TrustSection from '../components/landing/TrustSection'
import Footer from '../components/landing/Footer'

export default function Landing() {
  return (
    <div className="min-h-screen bg-base-100">
      <Header />
      <Hero />
      <Awareness />
      <HowItWorks />
      <ExplainableAIPreview />
      <TrackingPreview />
      <AIAssistantPreview />
      <TrustSection />
      <Footer />
    </div>
  )
}