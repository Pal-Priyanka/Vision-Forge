import { motion } from "framer-motion";
import { Database, FlaskConical, BarChart3, Lightbulb } from "lucide-react";

const steps = [
  {
    icon: <Database size={24} />,
    title: "Data Preparation",
    description: "COCO dataset subset selection, augmentation pipeline, train/val/test splits with 10-25-50-100% data scenarios.",
  },
  {
    icon: <FlaskConical size={24} />,
    title: "Model Training",
    description: "YOLOv5s, Faster R-CNN (ResNet-50), and ViT-DETR trained with identical hyperparameter schedules for fair comparison.",
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Evaluation",
    description: "mAP@50/75, precision-recall curves, inference stability over 100 runs, per-class accuracy analysis.",
  },
  {
    icon: <Lightbulb size={24} />,
    title: "Analysis & Insights",
    description: "Computational trade-offs, limited-data behavior, architecture advantages, and practical recommendations.",
  },
];

const MethodologyTimeline = () => {
  return (
    <section id="methodology" className="py-24 relative">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="text-gradient">Methodology</span>
          </h2>
          <p className="text-muted-foreground">Our systematic approach to benchmarking vision models.</p>
        </motion.div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-accent to-transparent" />

          <div className="space-y-12">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex gap-6 items-start"
              >
                {/* Node */}
                <div className="relative z-10 w-12 h-12 rounded-xl glass flex items-center justify-center text-primary flex-shrink-0 border-glow">
                  {step.icon}
                </div>

                {/* Content */}
                <div className="glass rounded-xl p-5 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-accent">Step {i + 1}</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MethodologyTimeline;
