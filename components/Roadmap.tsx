import React from 'react';
import { CheckCircle2, Circle, Gamepad2, Sparkles, Wrench, Zap, Code } from 'lucide-react';
import { useData } from '../context/DataContext';

const Roadmap: React.FC = () => {
  const { roadmapProjects } = useData();

  const getIcon = (type: string, className: string) => {
    switch (type) {
      case 'gamepad': return <Gamepad2 className={className} size={28} />;
      case 'sparkles': return <Sparkles className={className} size={28} />;
      case 'wrench': return <Wrench className={className} size={28} />;
      case 'zap': return <Zap className={className} size={28} />;
      case 'code': return <Code className={className} size={28} />;
      default: return <Sparkles className={className} size={28} />;
    }
  };

  return (
    <section id="roadmap" className="py-24 bg-neutral-950 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Development <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Roadmap</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Track the detailed progress of my projects and upcoming updates.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {roadmapProjects.map((project) => {
            const totalSteps = project.sections.reduce((acc, s) => acc + s.steps.length, 0);
            const completedSteps = project.sections.reduce((acc, s) => acc + s.steps.filter(st => st.isCompleted).length, 0);
            const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

            return (
              <div 
                key={project.id} 
                className="bg-black/50 backdrop-blur-sm rounded-3xl border border-white/10 p-8 flex flex-col h-full"
              >
                {/* Project Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${project.color} bg-opacity-20 border border-white/10`}>
                    {getIcon(project.iconType, "text-white")}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white">{project.title}</h3>
                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${project.color} transition-all duration-1000`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-gray-400">{Math.round(progress)}%</span>
                </div>
                {/* Sections and Steps */}
                <div className="space-y-8 flex-1">
                  {project.sections.map((section) => (
                    <div key={section.id}>
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <span className="h-px w-4 bg-gray-700"></span>
                        {section.title}
                      </h4>
                      <div className="space-y-3 pl-4">
                        {section.steps.map((step) => (
                          <div key={step.id} className="flex items-center gap-3">
                            {step.isCompleted ? (
                              <CheckCircle2 size={16} className="text-purple-500 flex-shrink-0" />
                            ) : (
                              <Circle size={16} className="text-gray-700 flex-shrink-0" />
                            )}
                            <span className={`text-sm ${step.isCompleted ? 'text-gray-300' : 'text-gray-600'}`}>
                              {step.text}
                            </span>
                          </div>
                        ))}
                        {section.steps.length === 0 && (
                          <p className="text-xs text-gray-700 italic">No steps planned for this phase yet.</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {project.sections.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                      <p>Planning in progress...</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Roadmap;
