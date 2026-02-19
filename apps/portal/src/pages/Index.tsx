import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import DetectionPlayground from "@/components/DetectionPlayground";
import MetricsDashboard from "@/components/MetricsDashboard";
import DatasetShowcase from "@/components/DatasetShowcase";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main
      style={{ backgroundColor: '#fafafa', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
      className="bg-background min-h-screen selection:bg-primary/30 selection:text-white"
    >
      <style>{`
        body { margin: 0; padding: 0; background-color: #fafafa; font-family: sans-serif; color: #171717; }
        .text-brand-gradient {
          background: linear-gradient(135deg, #0061e0 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          color: #0061e0;
          display: inline-block;
        }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .mt-12 { margin-top: 3rem; }
        .mb-8 { margin-bottom: 2rem; }
        .font-black { font-weight: 900; }
        .tracking-tighter { letter-spacing: -0.05em; }
        .leading-none { line-height: 1; }
        .text-6xl { font-size: 3.75rem; }
        .text-8xl { font-size: 6rem; }
        .glass-card {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
          border-radius: 2rem;
          padding: 2rem;
        }
      `}</style>
      <Navigation />
      <HeroSection />
      <DetectionPlayground />
      <MetricsDashboard />
      <DatasetShowcase />
      <Footer />
    </main>
  );
};

export default Index;
